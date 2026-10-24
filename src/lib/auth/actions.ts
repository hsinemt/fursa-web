"use server";

import { getLocale } from "next-intl/server";
import type { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { siteUrl } from "@/lib/site";
import { clearAuthCookies } from "./cookies";
import { mapAuthError, type AuthErrorKey } from "./errors";
import { HOME_FOR_SIGNED_IN, safeNext } from "./paths";
import { forgotInput, loginInput, resetInput, signupInput } from "./schemas";
import { mirrorAccessToken } from "./session";
import { createAuthClient, getCookieContext, getCookieJar } from "./server";

/**
 * Login, signup, password reset and logout. All of them run on the server: the browser
 * only sends the form and gets back a result. Sessions live in HttpOnly cookies (see
 * ./cookies.ts); nothing here ever returns a token. Passwords and emails are never logged.
 */

export type AuthResult =
  | {
      ok: true;
      /** A page of this site to go to (without the language), or null to stay. */
      next: string | null;
    }
  | { ok: false; error: AuthErrorKey; fieldErrors?: Record<string, string> };

const notConfigured: AuthResult = { ok: false, error: "not_configured" };

/** A form the server refuses (the browser checked it too): field messages by field name. */
function invalid(error: z.ZodError): AuthResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, error: "unknown", fieldErrors };
}

/** The link in a confirmation or reset email: this site, in the person's language. */
function callbackUrl(locale: string, next: string) {
  return `${siteUrl().origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInAction(input: unknown): Promise<AuthResult> {
  const parsed = loginInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const client = await createAuthClient();
  if (!client) return notConfigured;

  const { error } = await client.supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: mapAuthError(error) };

  await mirrorAccessToken(client.supabase, client.jar, client.ctx);
  return { ok: true, next: safeNext(parsed.data.next) ?? HOME_FOR_SIGNED_IN };
}

export async function signUpAction(input: unknown): Promise<AuthResult> {
  const parsed = signupInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const client = await createAuthClient();
  if (!client) return notConfigured;

  const { email, password, locale } = parsed.data;
  const { data, error } = await client.supabase.auth.signUp({
    email,
    password,
    options: {
      // The API reads user_metadata.locale the first time this person signs in.
      data: { locale },
      emailRedirectTo: callbackUrl(locale, HOME_FOR_SIGNED_IN),
    },
  });
  if (error) return { ok: false, error: mapAuthError(error) };

  // With "Confirm email" off, Supabase signs the new user in at once.
  if (data.session) {
    await mirrorAccessToken(client.supabase, client.jar, client.ctx);
    return { ok: true, next: HOME_FOR_SIGNED_IN };
  }
  return { ok: true, next: "/check-email" };
}

export async function requestPasswordResetAction(input: unknown): Promise<AuthResult> {
  const parsed = forgotInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const client = await createAuthClient();
  if (!client) return notConfigured;

  const { error } = await client.supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(parsed.data.locale, "/reset-password"),
  });
  // The answer is the same whether or not an account exists, so this cannot be used to find
  // out who has one. Only a refusal to send (too many requests, service down) is reported.
  if (error) {
    const key = mapAuthError(error);
    if (key === "rate_limited" || key === "unavailable") return { ok: false, error: key };
  }
  return { ok: true, next: null };
}

export async function updatePasswordAction(input: unknown): Promise<AuthResult> {
  const parsed = resetInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const client = await createAuthClient();
  if (!client) return notConfigured;

  // The reset link signed this person in (see the callback route): the password changes for
  // that session. Without one, Supabase refuses.
  const { error } = await client.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: mapAuthError(error) };

  await mirrorAccessToken(client.supabase, client.jar, client.ctx);
  return { ok: true, next: HOME_FOR_SIGNED_IN };
}

/** Logout: ends the Supabase session, clears both kinds of cookies, goes to the login page. */
export async function signOutAction(): Promise<void> {
  const [jar, ctx] = await Promise.all([getCookieJar(), getCookieContext()]);
  const client = await createAuthClient();
  try {
    await client?.supabase.auth.signOut();
  } catch {
    // The provider may be unreachable. The cookies are cleared below either way.
  }
  clearAuthCookies(jar, ctx);
  redirect({
    href: { pathname: "/login", query: { notice: "signed_out" } },
    locale: await getLocale(),
  });
}

/**
 * Called by the API client when the API answers `token_expired`: refreshes the session with
 * the refresh token in the Supabase cookies, and updates both cookies together. Returns
 * whether the request can be sent again. If the refresh fails the session is cleared.
 */
export async function refreshSession(): Promise<boolean> {
  const client = await createAuthClient();
  if (!client) return false;
  const { data, error } = await client.supabase.auth.refreshSession();
  if (error || !data.session) {
    clearAuthCookies(client.jar, client.ctx);
    return false;
  }
  await mirrorAccessToken(client.supabase, client.jar, client.ctx);
  return true;
}
