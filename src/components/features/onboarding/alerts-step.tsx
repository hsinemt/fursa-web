"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { DeliveryFields } from "@/components/features/notifications/delivery-fields";
import { parseScore } from "@/lib/notifications/values";
import type { PreferencesUpdate } from "@/lib/profile/hooks";

export { parseScore };

export type AlertValues = Pick<
  PreferencesUpdate,
  "email_enabled" | "frequency" | "min_score" | "digest_hour_utc"
>;

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
  const checkId = useId();

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
        <DeliveryFields
          frequency={values.frequency}
          digestHour={values.digest_hour_utc}
          score={score}
          scoreInvalid={scoreInvalid}
          onFrequency={(frequency) => onChange({ frequency })}
          onDigestHour={(hour) => onChange({ digest_hour_utc: hour })}
          onScore={onScore}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
