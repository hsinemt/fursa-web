const DEFAULT_SITE_URL = "http://localhost:3000";

/** Public URL of this site (NEXT_PUBLIC_SITE_URL), used for canonical and language links. */
export function siteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}
