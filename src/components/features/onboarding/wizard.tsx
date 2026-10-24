"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SeniorityPicker, TagGroup } from "@/components/features/profile/fields";
import { useSaveProfile } from "@/components/features/profile/use-save-profile";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useRouter } from "@/i18n/navigation";
import { useDescribeError } from "@/hooks/use-describe-error";
import type { DescribedError } from "@/lib/api";
import {
  usePreferences,
  useProfile,
  useUpdatePreferences,
  type Preferences,
} from "@/lib/profile/hooks";
import { fromProfile, type Profile, type ProfileValues } from "@/lib/profile/values";
import { AlertsStep, parseScore, type AlertValues } from "./alerts-step";

export const STEPS = ["roles", "skills", "locations", "level", "alerts"] as const;
type Step = (typeof STEPS)[number];

/** The five-step setup after sign up. Loads the profile and the alert settings first. */
export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const describe = useDescribeError();
  const profile = useProfile();
  const preferences = usePreferences();

  if (profile.isError || preferences.isError) {
    const error = profile.error ?? preferences.error;
    return (
      <div className="flex flex-col items-start gap-4">
        <ErrorPanel
          className="w-full"
          message={describe(error).message}
          code={describe(error).code}
        />
        <Button
          onClick={() => {
            void profile.refetch();
            void preferences.refetch();
          }}
        >
          {t("retryLoad")}
        </Button>
      </div>
    );
  }
  if (!profile.data || !preferences.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4 pt-8">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  return <Wizard profile={profile.data} preferences={preferences.data} />;
}

function Wizard({ profile, preferences }: { profile: Profile; preferences: Preferences }) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const toast = useToast();
  const handleSession = useApiErrorHandler();
  const updatePreferences = useUpdatePreferences();
  const profileSave = useSaveProfile();

  const [index, setIndex] = useState(0);
  const [baseline, setBaseline] = useState<ProfileValues>(() => fromProfile(profile));
  const [values, setValues] = useState<ProfileValues>(baseline);
  const [alerts, setAlerts] = useState<AlertValues>({
    email_enabled: preferences.email_enabled,
    frequency: preferences.frequency,
    min_score: preferences.min_score,
    digest_hour_utc: preferences.digest_hour_utc,
  });
  const [score, setScore] = useState(String(preferences.min_score));
  const [scoreInvalid, setScoreInvalid] = useState(false);
  const [alertError, setAlertError] = useState<DescribedError | null>(null);
  const describe = useDescribeError();

  const step: Step = STEPS[index] ?? "roles";
  const last = index === STEPS.length - 1;
  const busy = profileSave.saving || updatePreferences.isPending;

  // Each step starts with focus on its title, so a screen reader hears where it is.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  const set = (patch: Partial<ProfileValues>) => setValues((current) => ({ ...current, ...patch }));

  async function next() {
    if (!last) {
      if (step !== "alerts" && (await profileSave.save(baseline, values))) {
        setBaseline(values);
        setIndex(index + 1);
      }
      return;
    }
    const parsed = parseScore(score);
    setScoreInvalid(parsed === null);
    if (parsed === null && alerts.email_enabled) return;
    setAlertError(null);
    try {
      await updatePreferences.mutateAsync({
        ...alerts,
        min_score: parsed ?? alerts.min_score,
      });
      toast.show(t("done"));
      router.replace("/feed");
    } catch (cause) {
      if (await handleSession(cause)) return;
      setAlertError(describe(cause));
    }
  }

  function skip() {
    if (last) {
      router.replace("/feed");
      return;
    }
    setValues(baseline); // skipped means not saved
    profileSave.setProblems({});
    setIndex(index + 1);
  }

  const copy = (key: "title" | "text") => t(`steps.${step}.${key}`);

  return (
    <div className="pt-4">
      <p className="text-sm text-slate">{t("step", { current: index + 1, total: STEPS.length })}</p>
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {STEPS.map((name, i) => (
          <span
            key={name}
            className={
              i <= index ? "h-1 flex-1 rounded-full bg-accent" : "h-1 flex-1 rounded-full bg-line"
            }
          />
        ))}
      </div>

      <h1 ref={heading} tabIndex={-1} className="mt-8 text-xl outline-none">
        {copy("title")}
      </h1>
      <p className="mt-2 mb-6 text-slate">{copy("text")}</p>

      {step === "roles" ? (
        <TagGroup
          name="roles"
          hideLabel
          hideHelp
          value={values.roles}
          onChange={(roles) => set({ roles })}
        />
      ) : null}
      {step === "skills" ? (
        <TagGroup
          name="skills"
          hideLabel
          hideHelp
          value={values.skills}
          onChange={(skills) => set({ skills })}
        />
      ) : null}
      {step === "locations" ? (
        <TagGroup
          name="locations"
          hideLabel
          hideHelp
          value={values.locations}
          onChange={(locations) => set({ locations })}
        />
      ) : null}
      {step === "level" ? (
        <SeniorityPicker value={values.seniority} onChange={(seniority) => set({ seniority })} />
      ) : null}
      {step === "alerts" ? (
        <AlertsStep
          values={alerts}
          score={score}
          scoreInvalid={scoreInvalid}
          disabled={busy}
          onChange={(patch) => setAlerts((current) => ({ ...current, ...patch }))}
          onScore={(text) => {
            setScore(text);
            setScoreInvalid(false);
          }}
        />
      ) : null}

      {profileSave.error || alertError ? (
        <ErrorPanel
          className="mt-6"
          message={(profileSave.error ?? alertError)!.message}
          code={(profileSave.error ?? alertError)!.code}
        />
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={busy} onClick={() => void next()}>
          {busy ? t("saving") : last ? t("finish") : t("next")}
        </Button>
        {index > 0 ? (
          <Button disabled={busy} onClick={() => setIndex(index - 1)}>
            {t("back")}
          </Button>
        ) : null}
        <Button variant="ghost" disabled={busy} onClick={skip} className="ms-auto">
          {t("skip")}
        </Button>
      </div>
    </div>
  );
}
