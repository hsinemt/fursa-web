/**
 * Supabase auth errors, reduced to the few the interface explains. The key is a message under
 * `auth.errors` in the three message files. Details of the provider never reach the screen.
 */
export type AuthErrorKey =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "weak_password"
  | "same_password"
  | "rate_limited"
  | "signup_disabled"
  | "unavailable"
  | "not_configured"
  | "session_missing"
  | "unknown";

type ProviderError = { code?: string; status?: number; name?: string; message?: string };

export function mapAuthError(error: unknown): AuthErrorKey {
  if (typeof error !== "object" || error === null) return "unknown";
  const { code, status, name } = error as ProviderError;

  switch (code) {
    case "invalid_credentials":
      return "invalid_credentials";
    case "email_not_confirmed":
      return "email_not_confirmed";
    case "user_already_exists":
    case "email_exists":
      return "email_taken";
    case "weak_password":
      return "weak_password";
    case "same_password":
      return "same_password";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return "rate_limited";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signup_disabled";
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "bad_jwt":
    case "no_authorization":
      return "session_missing";
  }

  if (status === 429) return "rate_limited";
  if (name === "AuthRetryableFetchError" || (typeof status === "number" && status >= 500)) {
    return "unavailable";
  }
  if (status === 0) return "unavailable";
  return "unknown";
}
