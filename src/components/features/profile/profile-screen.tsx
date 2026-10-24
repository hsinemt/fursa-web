"use client";

import { Briefcase, MapPin, Sparkles, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useDescribeError } from "@/hooks/use-describe-error";
import { useProfile } from "@/lib/profile/hooks";
import {
  buildPatch,
  fromProfile,
  isEmptyPatch,
  type Profile,
  type ProfileValues,
} from "@/lib/profile/values";
import { SalaryGroup, SeniorityPicker, TagGroup } from "./fields";
import { ProfileRail } from "./profile-rail";
import { useSaveProfile } from "./use-save-profile";

/** One group of the profile: icon, title, one line of help, then its field. */
function SectionCard({
  id,
  icon: Icon,
  title,
  help,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`profile-${id}`} className="scroll-mt-6 rounded-panel bg-panel p-5">
      <div className="mb-4 flex items-start gap-3">
        <Icon
          className="mt-1 shrink-0 text-slate"
          width={ICON_SM}
          height={ICON_SM}
          {...iconProps}
        />
        <div className="min-w-0 flex-1">
          <h2 id={`profile-${id}-title`} className="text-md">
            {title}
          </h2>
          <p className="text-sm text-slate">{help}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** The profile page: loads the profile, then shows the rail and the cards. */
export function ProfileScreen({ email = null }: { email?: string | null }) {
  const t = useTranslations("profile");
  const describe = useDescribeError();
  const query = useProfile();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("intro")}</p>
      <div className="mt-8">
        {query.isPending ? (
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" aria-busy="true">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-52" />
              <Skeleton className="h-64" />
            </div>
            <div className="flex flex-col gap-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-start gap-4">
            <ErrorPanel
              className="w-full"
              message={t("loadFailed")}
              code={describe(query.error).code}
            />
            <Button onClick={() => void query.refetch()}>{t("retry")}</Button>
          </div>
        ) : (
          <ProfileForm profile={query.data} email={email} />
        )}
      </div>
    </div>
  );
}

function ProfileForm({ profile, email }: { profile: Profile; email: string | null }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const [baseline, setBaseline] = useState<ProfileValues>(() => fromProfile(profile));
  const [values, setValues] = useState<ProfileValues>(baseline);
  const { save, saving, problems, error } = useSaveProfile();
  const [note, setNote] = useState(false);

  const dirty = !isEmptyPatch(buildPatch(baseline, values));

  const set = (patch: Partial<ProfileValues>) => {
    setNote(false);
    setValues((current) => ({ ...current, ...patch }));
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty) {
      setNote(true);
      return;
    }
    if (await save(baseline, values)) {
      setBaseline(values);
      toast.show(t("saved"));
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <ProfileRail email={email} values={values} />

      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard id="roles" icon={Briefcase} title={t("roles.label")} help={t("roles.help")}>
          <TagGroup
            name="roles"
            hideLabel
            hideHelp
            value={values.roles}
            onChange={(roles) => set({ roles })}
          />
        </SectionCard>
        <SectionCard id="skills" icon={Sparkles} title={t("skills.label")} help={t("skills.help")}>
          <TagGroup
            name="skills"
            hideLabel
            hideHelp
            value={values.skills}
            onChange={(skills) => set({ skills })}
          />
        </SectionCard>
        <SectionCard
          id="locations"
          icon={MapPin}
          title={t("locations.label")}
          help={t("locations.help")}
        >
          <TagGroup
            name="locations"
            hideLabel
            hideHelp
            value={values.locations}
            onChange={(locations) => set({ locations })}
          />
        </SectionCard>
        <SectionCard
          id="seniority"
          icon={TrendingUp}
          title={t("seniority.label")}
          help={t("seniority.help")}
        >
          <SeniorityPicker value={values.seniority} onChange={(seniority) => set({ seniority })} />
        </SectionCard>
        <SectionCard id="salary" icon={Wallet} title={t("salary.title")} help={t("salary.help")}>
          <SalaryGroup values={values} problems={problems} onChange={set} />
        </SectionCard>

        {error ? <ErrorPanel message={error.message} code={error.code} /> : null}

        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-panel border border-line bg-panel p-3 sm:bottom-4">
          <p role="status" className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate">
            <span
              aria-hidden="true"
              className={
                dirty
                  ? "size-2 shrink-0 rounded-full bg-accent"
                  : "size-2 shrink-0 rounded-full bg-slate"
              }
            />
            {note ? t("noChanges") : dirty ? t("unsaved") : t("allSaved")}
          </p>
          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setNote(false);
                setValues(baseline);
              }}
            >
              {t("discard")}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
