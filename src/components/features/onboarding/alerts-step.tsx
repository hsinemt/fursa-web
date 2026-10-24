"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/components/features/auth/field";
import type { PreferencesUpdate } from "@/lib/profile/hooks";
import { cn } from "@/lib/utils/cn";

export type AlertValues = Pick<
  PreferencesUpdate,
  "email_enabled" | "frequency" | "min_score" | "digest_hour_utc"
>;

/** The score is typed as text; this is the number the API gets, or null when it is not valid. */
export function parseScore(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : null;
}

type Props = {
  values: AlertValues;
  score: string;
  scoreInvalid: boolean;
  onChange: (patch: Partial<AlertValues>) => void;
  onScore: (text: string) => void;
  disabled?: boolean;
};

/** How Fursa tells the person about good jobs: email on or off, how often, how good. */
export function AlertsStep({ values, score, scoreInvalid, onChange, onScore, disabled }: Props) {
  const t = useTranslations("onboarding.alerts");
  const v = useTranslations("profile.validation");
  const checkId = useId();
  const hourId = useId();
  const options = [
    { code: "daily", label: t("daily") },
    { code: "instant", label: t("instant") },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <input
          id={checkId}
          type="checkbox"
          checked={values.email_enabled}
          disabled={disabled}
          onChange={(event) => onChange({ email_enabled: event.target.checked })}
          className="size-5 accent-accent"
        />
        <label htmlFor={checkId} className="text-base text-ink">
          {t("email")}
        </label>
      </div>

      {values.email_enabled ? (
        <>
          <div role="group" aria-label={t("frequency")} className="flex flex-wrap gap-2">
            {options.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                disabled={disabled}
                aria-pressed={values.frequency === code}
                onClick={() => onChange({ frequency: code })}
                className={cn(
                  "h-10 rounded-control border px-4 text-base pointer-coarse:h-11",
                  values.frequency === code
                    ? "border-accent bg-tint text-accent"
                    : "border-control bg-transparent text-ink hover:bg-tint",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {values.frequency === "daily" ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={hourId} className="text-base font-medium text-ink">
                {t("digestHour")}
              </label>
              <select
                id={hourId}
                dir="ltr"
                value={values.digest_hour_utc}
                disabled={disabled}
                onChange={(event) => onChange({ digest_hour_utc: Number(event.target.value) })}
                className="h-10 w-40 rounded-control border border-control bg-panel px-2 text-base text-ink pointer-coarse:h-11"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {t("hourOption", { hour: String(hour).padStart(2, "0") })}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="max-w-40">
            <Field
              label={t("minScore")}
              inputMode="numeric"
              dir="ltr"
              value={score}
              disabled={disabled}
              error={scoreInvalid ? v("score_range") : undefined}
              onChange={(event) => onScore(event.target.value)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
