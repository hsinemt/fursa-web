import { createServerClient } from "@supabase/ssr";
import type { AuthConfig } from "./config";
import {
  hardenSessionCookie,
  writeAccessTokenCookie,
  type CookieContext,
  type CookieJar,
} from "./cookies";

/**
 * A Supabase client for server code: it reads the session from `jar` and writes every change
 * back to it with the cookie flags forced (HttpOnly, SameSite=Lax, Secure over https).
 * `onHeaders` receives the cache headers Supabase asks for when it writes cookies: set them
 * on the response so no CDN caches a response that carries a session.
 * Create one client per request.
 */
export function createSupabase(
  config: AuthConfig,
  jar: CookieJar,
  ctx: CookieContext,
  onHeaders?: (headers: Record<string, string>) => void,
) {
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (cookies, headers) => {
        for (const { name, value, options } of cookies) {
          jar.set(name, value, hardenSessionCookie(options, ctx));
        }
        onHeaders?.(headers);
      },
    },
  });
}

export type AuthClient = ReturnType<typeof createSupabase>;

/**
 * Copies the current access token into `fursa_access_token`. Call it after anything that
 * changes the session (login, refresh, code exchange, password change), so the two kinds of
 * cookies never disagree. The token is only copied here; fursa-api verifies it on each call.
 */
export async function mirrorAccessToken(supabase: AuthClient, jar: CookieJar, ctx: CookieContext) {
  const { data } = await supabase.auth.getSession();
  writeAccessTokenCookie(jar, data.session, ctx);
}
