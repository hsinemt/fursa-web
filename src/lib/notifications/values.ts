import type { Preferences, PreferencesUpdate } from "@/lib/profile/hooks";

/** What the Alerts form edits. The score is typed as text and checked before saving. */
export type AlertsForm = {
  email_enabled: boolean;
  frequency: Preferences["frequency"];
  digest_hour_utc: number;
  score: string;
};

export function fromPreferences(prefs: Preferences): AlertsForm {
  return {
    email_enabled: prefs.email_enabled,
    frequency: prefs.frequency,
    digest_hour_utc: prefs.digest_hour_utc,
    score: String(Math.round(prefs.min_score)),
  };
}

/** The score as the number the API gets, or null when the text is not a whole number 0 to 100. */
export function parseScore(text: string): number | null {
  if (!/^\d{1,3}$/.test(text.trim())) return null;
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : null;
}

/** Only the fields that changed (a partial update). An invalid score is left out. */
export function buildPreferencesPatch(
  baseline: AlertsForm,
  values: AlertsForm,
): Partial<PreferencesUpdate> {
  const patch: Partial<PreferencesUpdate> = {};
  if (values.email_enabled !== baseline.email_enabled) patch.email_enabled = values.email_enabled;
  if (values.frequency !== baseline.frequency) patch.frequency = values.frequency;
  if (values.digest_hour_utc !== baseline.digest_hour_utc) {
    patch.digest_hour_utc = values.digest_hour_utc;
  }
  const score = parseScore(values.score);
  if (score !== null && score !== parseScore(baseline.score)) patch.min_score = score;
  return patch;
}

/** A Telegram link the page may open: https on t.me or telegram.me only. */
export function safeTelegramUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "t.me" || host === "telegram.me")
      ? url.href
      : null;
  } catch {
    return null;
  }
}
