"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/components/features/auth/field";
import type { Preferences } from "@/lib/profile/hooks";
import { cn } from "@/lib/utils/cn";

type Props = {
  frequency: Preferences["frequency"];
  digestHour: number;
  score: string;
  scoreInvalid: boolean;
  onFrequency: (frequency: Preferences["frequency"]) => void;
  onDigestHour: (hour: number) => void;
  onScore: (text: string) => void;
  disabled?: boolean;
};

/**
 * When and how good: daily or instant, the hour of the daily digest (UTC) and the minimum
 * score. Shared by the onboarding step and the settings page (the schedule is one for all
 * channels).
 */
export function DeliveryFields({
  frequency,
  digestHour,
  score,
  scoreInvalid,
  onFrequency,
  onDigestHour,
  onScore,
  disabled,
}: Props) {
  const t = useTranslations("onboarding.alerts");
  const v = useTranslations("profile.validation");
  const hourId = useId();
  const options = [
    { code: "daily", label: t("daily") },
    { code: "instant", label: t("instant") },
  ] as const;

  return (
    <>
      <div role="group" aria-label={t("frequency")} className="flex flex-wrap gap-2">
        {options.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            disabled={disabled}
            aria-pressed={frequency === code}
            onClick={() => onFrequency(code)}
            className={cn(
              "h-10 rounded-control border px-4 text-base pointer-coarse:h-11",
              frequency === code
                ? "border-accent bg-tint text-accent"
                : "border-control bg-transparent text-ink hover:bg-tint",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {frequency === "daily" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={hourId} className="text-base font-medium text-ink">
            {t("digestHour")}
          </label>
          <select
            id={hourId}
            dir="ltr"
            value={digestHour}
            disabled={disabled}
            onChange={(event) => onDigestHour(Number(event.target.value))}
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
  );
}
