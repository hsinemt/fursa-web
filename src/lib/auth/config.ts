/**
 * Where the Supabase settings are read. This is public information by design (the project
 * URL and the publishable key), but it is read on the server only. A secret key is refused:
 * the service role key must never be in this project.
 */

export type AuthConfig = { url: string; key: string };

type Env = Record<string, string | undefined>;

/** True for Supabase's secret key formats (sb_secret_..., or a legacy service_role JWT). */
export function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    const role = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))?.role;
    return role === "service_role";
  } catch {
    return false;
  }
}

/** The Supabase settings, or null if they are missing, still the placeholders, or unsafe. */
export function getAuthConfig(env: Env = process.env): AuthConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  if (url.includes("your-project") || key === "your-publishable-key") return null;
  if (isSecretKey(key)) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, key };
}
