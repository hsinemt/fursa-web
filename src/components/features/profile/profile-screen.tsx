"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
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
import { useSaveProfile } from "./use-save-profile";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-line pt-6">
    <h2 className="mb-3 text-md">{title}</h2>
    {children}
  </section>
);

/** The profile page: loads the profile, then shows the form. */
export function ProfileScreen() {
  const t = useTranslations("profile");
  const describe = useDescribeError();
  const query = useProfile();

  return (
    <div className="max-w-xl">
      <h1 className="text-xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("intro")}</p>
      <div className="mt-8">
        {query.isPending ? (
          <div className="flex flex-col gap-6" aria-busy="true">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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
          <ProfileForm profile={query.data} />
        )}
      </div>
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const toast = useToast();
  const [baseline, setBaseline] = useState<ProfileValues>(() => fromProfile(profile));
  const [values, setValues] = useState<ProfileValues>(baseline);
  const { save, saving, problems, error } = useSaveProfile();
  const [note, setNote] = useState(false);

  const set = (patch: Partial<ProfileValues>) => {
    setNote(false);
    setValues((current) => ({ ...current, ...patch }));
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isEmptyPatch(buildPatch(baseline, values))) {
      setNote(true);
      return;
    }
    if (await save(baseline, values)) {
      setBaseline(values);
      toast.show(t("saved"));
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Section title={t("roles.label")}>
        <TagGroup
          name="roles"
          hideLabel
          value={values.roles}
          onChange={(roles) => set({ roles })}
        />
      </Section>
      <Section title={t("skills.label")}>
        <TagGroup
          name="skills"
          hideLabel
          value={values.skills}
          onChange={(skills) => set({ skills })}
        />
      </Section>
      <Section title={t("locations.label")}>
        <TagGroup
          name="locations"
          hideLabel
          value={values.locations}
          onChange={(locations) => set({ locations })}
        />
      </Section>
      <Section title={t("seniority.label")}>
        <p className="mb-3 text-sm text-slate">{t("seniority.help")}</p>
        <SeniorityPicker value={values.seniority} onChange={(seniority) => set({ seniority })} />
      </Section>
      <Section title={t("salary.title")}>
        <p className="mb-3 text-sm text-slate">{t("salary.help")}</p>
        <SalaryGroup values={values} problems={problems} onChange={set} />
      </Section>

      {error ? <ErrorPanel message={error.message} code={error.code} /> : null}
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
        {note ? (
          <p role="status" className="text-slate">
            {t("noChanges")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
