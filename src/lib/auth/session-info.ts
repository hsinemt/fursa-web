"use server";

import { createAuthClient, getCurrentUser } from "./server";

/**
 * What the dev console shows about the session. The access token is HttpOnly, so the browser
 * cannot read when it expires: this Server Action says it, without ever returning the token.
 * Only the dev console imports it, so it is not part of a production build.
 */
export type SessionInfo = {
  /** Login is set up on this server (the Supabase settings are present). */
  configured: boolean;
  signedIn: boolean;
  /** When the access token expires, in seconds since 1970. */
  expiresAt: number | null;
  email: string | null;
};

export async function getSessionInfo(): Promise<SessionInfo> {
  const client = await createAuthClient();
  if (!client) return { configured: false, signedIn: false, expiresAt: null, email: null };

  const { data } = await client.supabase.auth.getSession();
  if (!data.session) return { configured: true, signedIn: false, expiresAt: null, email: null };

  const user = await getCurrentUser();
  return {
    configured: true,
    signedIn: true,
    expiresAt: data.session.expires_at ?? null,
    email: user?.email ?? null,
  };
}
