"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { useToast } from "@/components/ui/toast";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useDescribeError } from "@/hooks/use-describe-error";
import { formatDate } from "@/lib/feed/values";
import {
  buildPreferencesPatch,
  fromPreferences,
  parseScore,
  type AlertsForm,
} from "@/lib/notifications/values";
import { useUpdatePreferences, type Preferences } from "@/lib/profile/hooks";
import { useLocale } from "next-intl";
import { DeliveryFields } from "./delivery-fields";

/**
 * Email on or off, and the schedule shared by email and Telegram. One Save button that sends
 * only what changed. The fields show while email is on here or Telegram is on on the server.
 */
export function AlertsSection({ prefs }: { prefs: Preferences }) {
  const t = useTranslations("settings.alerts");
  const toast = useToast();
  const locale = useLocale();
  const describe = useDescribeError();
  const handle = useApiErrorHandler();
  const update = useUpdatePreferences();
  const checkId = useId();

  const [baseline, setBaseline] = useState<AlertsForm>(() => fromPreferences(prefs));
  const [values, setValues] = useState<AlertsForm>(baseline);
  const [submitted, setSubmitted] = useState(false);
  const [note, setNote] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const showFields = values.email_enabled || prefs.telegram_enabled;
  const scoreInvalid = submitted && showFields && parseScore(values.score) === null;
  const set = (patch: Partial<AlertsForm>) => {
    setNote(false);
    setValues((current) => ({ ...current, ...patch }));
  };

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (showFields && parseScore(values.score) === null) return;
    const patch = buildPreferencesPatch(baseline, values);
    if (Object.keys(patch).length === 0) {
      setNote(true);
      return;
    }
    update.mutate(patch, {
      onSuccess: () => {
        setBaseline(values);
        setSubmitted(false);
        toast.show(t("saved"));
      },
      onError: (failure) => {
        setError(failure);
        void handle(failure);
      },
    });
  }

  const described = error ? describe(error) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <input
          id={checkId}
          type="checkbox"
          checked={values.email_enabled}
          onChange={(event) => set({ email_enabled: event.target.checked })}
          className="size-5 accent-accent"
        />
        <label htmlFor={checkId} className="text-base text-ink">
          {t("email")}
        </label>
      </div>
      {prefs.email_unsubscribed_at ? (
        <p className="-mt-3 text-sm text-slate">
          {t("unsubscribed", { date: formatDate(prefs.email_unsubscribed_at, locale) })}
        </p>
      ) : null}

      {showFields ? (
        <>
          <p className="text-slate">{t("shared")}</p>
          <DeliveryFields
            frequency={values.frequency}
            digestHour={values.digest_hour_utc}
            score={values.score}
            scoreInvalid={scoreInvalid}
            onFrequency={(frequency) => set({ frequency })}
            onDigestHour={(hour) => set({ digest_hour_utc: hour })}
            onScore={(score) => set({ score })}
          />
        </>
      ) : null}

      {described ? <ErrorPanel message={described.message} code={described.code} /> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" disabled={update.isPending}>
          {t("save")}
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
