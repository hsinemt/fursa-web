import { locales } from "@/i18n/routing";

/** Screens that need a signed-in user (the app). Everything else is public. */
const PROTECTED_PREFIXES = [
  "/feed",
  "/pipeline",
  "/profile",
  "/settings",
  "/jobs",
  "/onboarding",
  "/dev",
];

/** Developer pages that stay public even under /dev. */
const PUBLIC_EXCEPTIONS = ["/dev/style"];

/** Pages a signed-in person has no use for: they are sent to the feed. */
const GUEST_ONLY = ["/", "/login", "/signup", "/forgot-password"];

export const HOME_FOR_SIGNED_IN = "/feed";

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Splits "/ar/feed" into { locale: "ar", path: "/feed" }. No locale prefix: locale is null. */
export function stripLocale(pathname: string): { locale: string | null; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  const locale = locales.find((code) => code === first);
  if (!locale) return { locale: null, path: pathname || "/" };
  return { locale, path: `/${rest.join("/")}`.replace(/\/+$/, "") || "/" };
}

export function isProtectedPath(path: string): boolean {
  if (PUBLIC_EXCEPTIONS.some((prefix) => matches(path, prefix))) return false;
  return PROTECTED_PREFIXES.some((prefix) => matches(path, prefix));
}

export function isGuestOnlyPath(path: string): boolean {
  return GUEST_ONLY.includes(path);
}

/**
 * The page to go to after login, from the `next` parameter. Only a path inside this site is
 * accepted: nothing with a scheme or host, no "//", no backslash. Anything else is null.
 * A language prefix is dropped (the router adds the current one).
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  const { path } = stripLocale(value.split(/[?#]/)[0] ?? "/");
  const rest = value.slice((value.split(/[?#]/)[0] ?? "").length);
  const full = `${path}${rest}`;
  if (full.startsWith("//")) return null;
  // Never bounce back to a sign-in page.
  if (isGuestOnlyPath(path) && path !== "/") return null;
  return full;
}

export type AccessDecision = { type: "next" } | { type: "redirect"; to: string; next?: string };

/**
 * What to do with a request. `path` has no language prefix. When login is not set up nobody
 * can be signed in, so the app pages send visitors to login, where they are told it is not set up.
 */
export function decideAccess(input: {
  path: string;
  search?: string;
  signedIn: boolean;
}): AccessDecision {
  const { path, search = "", signedIn } = input;
  if (!signedIn && isProtectedPath(path)) {
    return { type: "redirect", to: "/login", next: `${path}${search}` };
  }
  if (signedIn && isGuestOnlyPath(path)) {
    return { type: "redirect", to: HOME_FOR_SIGNED_IN };
  }
  return { type: "next" };
}
