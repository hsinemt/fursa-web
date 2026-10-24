import type { CookieOptions } from "@supabase/ssr";

/**
 * The two kinds of session cookies (see "Auth and cookies" in fursa web.md):
 *
 * 1. Supabase's own session cookies (`sb-...`), HttpOnly, read only by our proxy to
 *    refresh the session.
 * 2. `fursa_access_token`: the raw access token (the JWT), the one cookie fursa-api reads.
 *    HttpOnly, SameSite=Lax, Secure over https, living exactly as long as the token.
 *
 * Login, refresh and logout write both together. Nothing in the browser can read either.
 */
export const ACCESS_TOKEN_COOKIE = "fursa_access_token";
export const SUPABASE_COOKIE_PREFIX = "sb-";

/** Where the cookies of the current request live (the request, a response, or a store). */
export type CookieJar = {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options: CookieOptions): void;
};

export type CookieContext = {
  /** Secure flag: on when the site is served over https. */
  secure: boolean;
  /** Production: the domain shared with the API (".fursa.app"), so the API gets the cookie. */
  domain?: string;
};

/** Options of `fursa_access_token`. */
export function accessTokenOptions(ctx: CookieContext, maxAge: number): CookieOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.secure,
    maxAge,
    ...(ctx.domain ? { domain: ctx.domain } : {}),
  };
}

/** Supabase picks the expiry of its cookies; we force the flags. */
export function hardenSessionCookie(options: CookieOptions, ctx: CookieContext): CookieOptions {
  return { ...options, path: "/", httpOnly: true, sameSite: "lax", secure: ctx.secure };
}

type SessionLike = { access_token: string; expires_at?: number | null };

/** How long the cookie lives: until the token expires (about an hour if it does not say). */
export function secondsUntilExpiry(session: SessionLike, now = Math.floor(Date.now() / 1000)) {
  return session.expires_at ? session.expires_at - now : 3600;
}

export function clearAccessTokenCookie(jar: CookieJar, ctx: CookieContext) {
  jar.set(ACCESS_TOKEN_COOKIE, "", accessTokenOptions(ctx, 0));
}

/** Writes `fursa_access_token` for this session, or clears it if there is none (or it expired). */
export function writeAccessTokenCookie(
  jar: CookieJar,
  session: SessionLike | null,
  ctx: CookieContext,
  now?: number,
) {
  if (!session) return clearAccessTokenCookie(jar, ctx);
  const maxAge = secondsUntilExpiry(session, now);
  if (maxAge <= 0) return clearAccessTokenCookie(jar, ctx);
  jar.set(ACCESS_TOKEN_COOKIE, session.access_token, accessTokenOptions(ctx, maxAge));
}

/** Logout: clears `fursa_access_token` and every Supabase session cookie. */
export function clearAuthCookies(jar: CookieJar, ctx: CookieContext) {
  clearAccessTokenCookie(jar, ctx);
  for (const { name } of jar.getAll()) {
    if (name.startsWith(SUPABASE_COOKIE_PREFIX)) {
      jar.set(name, "", hardenSessionCookie({ maxAge: 0 }, ctx));
    }
  }
}
