import type { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "./config";
import {
  ACCESS_TOKEN_COOKIE,
  SUPABASE_COOKIE_PREFIX,
  clearAccessTokenCookie,
  type CookieContext,
  type CookieJar,
} from "./cookies";
import { createSupabase, mirrorAccessToken } from "./session";

type ResponseCookieOptions = Parameters<NextResponse["cookies"]["set"]>[2];

export type AuthState = {
  /** Login is set up on this server (the Supabase settings are present and safe). */
  configured: boolean;
  signedIn: boolean;
};

/**
 * Runs in the proxy on every page request, before the page renders: refreshes the session
 * if the token is about to expire and keeps both cookies in step (Supabase's and
 * `fursa_access_token`). It does nothing, and costs nothing, for a visitor with no session
 * cookie. The cookies are written on `response` (and on the request, so the page sees them).
 */
export async function authenticate(
  request: NextRequest,
  response: NextResponse,
): Promise<AuthState> {
  const config = getAuthConfig();
  if (!config) return { configured: false, signedIn: false };

  const forwarded = request.headers.get("x-forwarded-proto");
  const ctx: CookieContext = {
    secure: forwarded ? forwarded === "https" : request.nextUrl.protocol === "https:",
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
  };
  const jar: CookieJar = {
    getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      request.cookies.set(name, value);
      response.cookies.set(name, value, options as ResponseCookieOptions);
    },
  };

  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith(SUPABASE_COOKIE_PREFIX));
  if (!hasSession) {
    // A leftover access token with no session behind it: remove it.
    if (request.cookies.has(ACCESS_TOKEN_COOKIE)) clearAccessTokenCookie(jar, ctx);
    return { configured: true, signedIn: false };
  }

  const supabase = createSupabase(config, jar, ctx, (headers) => {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  });
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && !!data?.claims;

  if (signedIn) await mirrorAccessToken(supabase, jar, ctx);
  else clearAccessTokenCookie(jar, ctx);
  return { configured: true, signedIn };
}
