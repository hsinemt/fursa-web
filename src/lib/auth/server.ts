import { cookies, headers } from "next/headers";
import { siteUrl } from "@/lib/site";
import { getAuthConfig } from "./config";
import type { CookieContext, CookieJar } from "./cookies";
import { createSupabase } from "./session";

/** Secure cookies over https: the site's own address, or the proxy's X-Forwarded-Proto. */
export async function getCookieContext(): Promise<CookieContext> {
  const forwarded = (await headers()).get("x-forwarded-proto");
  const secure = forwarded ? forwarded === "https" : siteUrl().protocol === "https:";
  return { secure, domain: process.env.AUTH_COOKIE_DOMAIN || undefined };
}

/** The cookies of the current request, for Server Actions and Route Handlers. */
export async function getCookieJar(): Promise<CookieJar> {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      try {
        store.set(name, value, options as Parameters<typeof store.set>[2]);
      } catch {
        // A Server Component cannot write cookies. The proxy already refreshed the session
        // before the page rendered, so there is nothing to lose.
      }
    },
  };
}

/** A Supabase client for this request, or null when login is not set up. */
export async function createAuthClient() {
  const config = getAuthConfig();
  if (!config) return null;
  const [jar, ctx] = await Promise.all([getCookieJar(), getCookieContext()]);
  return { supabase: createSupabase(config, jar, ctx), jar, ctx };
}

export type SignedInUser = { id: string; email: string | null };

/**
 * The signed-in user of this request, or null. It reads the verified claims of the token,
 * not the raw cookie. Only for the person's own page: the API stays the judge of every call.
 */
export async function getCurrentUser(): Promise<SignedInUser | null> {
  const client = await createAuthClient();
  if (!client) return null;
  const { data, error } = await client.supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
}
