// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getAuthConfig, isSecretKey } from "@/lib/auth/config";
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenOptions,
  clearAuthCookies,
  hardenSessionCookie,
  secondsUntilExpiry,
  writeAccessTokenCookie,
  type CookieJar,
} from "@/lib/auth/cookies";
import { mapAuthError } from "@/lib/auth/errors";
import {
  decideAccess,
  isGuestOnlyPath,
  isProtectedPath,
  safeNext,
  stripLocale,
} from "@/lib/auth/paths";
import { forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/auth/schemas";

function fakeJar(existing: string[] = []) {
  const calls: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const jar: CookieJar = {
    getAll: () => existing.map((name) => ({ name, value: "x" })),
    set: (name, value, options) => calls.push({ name, value, options: options as never }),
  };
  return { jar, calls };
}

describe("paths", () => {
  it("splits the language prefix", () => {
    expect(stripLocale("/ar/feed")).toEqual({ locale: "ar", path: "/feed" });
    expect(stripLocale("/en")).toEqual({ locale: "en", path: "/" });
    expect(stripLocale("/en/")).toEqual({ locale: "en", path: "/" });
    expect(stripLocale("/xx/feed")).toEqual({ locale: null, path: "/xx/feed" });
  });

  it("protects the app screens, not the public pages or the style page", () => {
    for (const path of [
      "/feed",
      "/pipeline",
      "/profile",
      "/settings",
      "/jobs/12",
      "/onboarding",
      "/dev",
    ]) {
      expect(isProtectedPath(path), path).toBe(true);
    }
    for (const path of [
      "/",
      "/login",
      "/signup",
      "/privacy",
      "/terms",
      "/dev/style",
      "/reset-password",
    ]) {
      expect(isProtectedPath(path), path).toBe(false);
    }
    expect(isProtectedPath("/feeds")).toBe(false);
  });

  it("knows the pages a signed-in person is sent away from", () => {
    expect(["/", "/login", "/signup", "/forgot-password"].every(isGuestOnlyPath)).toBe(true);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
    expect(isGuestOnlyPath("/feed")).toBe(false);
  });

  it("decides: login for guests on app pages, the feed for signed-in people on guest pages", () => {
    expect(decideAccess({ path: "/feed", search: "?x=1", signedIn: false })).toEqual({
      type: "redirect",
      to: "/login",
      next: "/feed?x=1",
    });
    expect(decideAccess({ path: "/login", signedIn: true })).toEqual({
      type: "redirect",
      to: "/feed",
    });
    expect(decideAccess({ path: "/", signedIn: true })).toEqual({ type: "redirect", to: "/feed" });
    expect(decideAccess({ path: "/", signedIn: false })).toEqual({ type: "next" });
    expect(decideAccess({ path: "/feed", signedIn: true })).toEqual({ type: "next" });
    expect(decideAccess({ path: "/reset-password", signedIn: true })).toEqual({ type: "next" });
    expect(decideAccess({ path: "/dev/style", signedIn: false })).toEqual({ type: "next" });
  });
});

describe("safeNext (no open redirect)", () => {
  it("accepts a page of this site, and drops the language prefix", () => {
    expect(safeNext("/feed")).toBe("/feed");
    expect(safeNext("/jobs/3?tab=a")).toBe("/jobs/3?tab=a");
    expect(safeNext("/ar/jobs/3")).toBe("/jobs/3");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "feed",
    "/ar//evil.example",
    "/login",
    "/en/signup",
    "/feed\n/x",
    "/" + "a".repeat(400),
    "",
  ])("refuses %j", (value) => {
    expect(safeNext(value)).toBeNull();
  });

  it("refuses nothing but null for a missing value", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});

describe("auth config", () => {
  it("needs both values, real ones", () => {
    expect(getAuthConfig({})).toBeNull();
    expect(getAuthConfig({ SUPABASE_URL: "https://abc.supabase.co" })).toBeNull();
    expect(getAuthConfig({ SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "" })).toBeNull();
    expect(
      getAuthConfig({
        SUPABASE_URL: "https://your-project.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "k",
      }),
    ).toBeNull();
    expect(
      getAuthConfig({
        SUPABASE_URL: "https://abc.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "your-publishable-key",
      }),
    ).toBeNull();
    expect(
      getAuthConfig({ SUPABASE_URL: "not a url", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" }),
    ).toBeNull();
  });

  it("accepts a project URL and a publishable key", () => {
    expect(
      getAuthConfig({
        SUPABASE_URL: " https://abc.supabase.co ",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
      }),
    ).toEqual({ url: "https://abc.supabase.co", key: "sb_publishable_x" });
  });

  it("refuses a secret key: the service role key must never be used here", () => {
    const legacyServiceRole = `h.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.s`;
    const legacyAnon = `h.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.s`;
    expect(isSecretKey("sb_secret_abc")).toBe(true);
    expect(isSecretKey(legacyServiceRole)).toBe(true);
    expect(isSecretKey(legacyAnon)).toBe(false);
    expect(isSecretKey("sb_publishable_abc")).toBe(false);
    expect(
      getAuthConfig({
        SUPABASE_URL: "https://abc.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
      }),
    ).toBeNull();
    expect(
      getAuthConfig({
        SUPABASE_URL: "https://abc.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: legacyServiceRole,
      }),
    ).toBeNull();
  });
});

describe("cookies", () => {
  it("fursa_access_token is HttpOnly, SameSite=Lax, path /, Secure only over https", () => {
    expect(accessTokenOptions({ secure: false }, 3000)).toEqual({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 3000,
    });
    expect(accessTokenOptions({ secure: true }, 3000)).toMatchObject({
      secure: true,
      httpOnly: true,
    });
  });

  it("takes the shared domain only when one is given (production)", () => {
    expect(accessTokenOptions({ secure: true, domain: ".fursa.app" }, 60)).toMatchObject({
      domain: ".fursa.app",
    });
    expect(accessTokenOptions({ secure: true }, 60)).not.toHaveProperty("domain");
  });

  it("forces the flags on Supabase's session cookies and keeps their expiry", () => {
    expect(
      hardenSessionCookie({ maxAge: 999, httpOnly: false, sameSite: "none" }, { secure: true }),
    ).toEqual({
      maxAge: 999,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  });

  it("the cookie lives as long as the token", () => {
    expect(secondsUntilExpiry({ access_token: "t", expires_at: 1_000_600 }, 1_000_000)).toBe(600);
    expect(secondsUntilExpiry({ access_token: "t" }, 1_000_000)).toBe(3600);
  });

  it("writes the token with the remaining life, and clears it for no session or an old one", () => {
    const written = fakeJar();
    writeAccessTokenCookie(
      written.jar,
      { access_token: "jwt", expires_at: 1_000_900 },
      { secure: false },
      1_000_000,
    );
    expect(written.calls).toEqual([
      {
        name: ACCESS_TOKEN_COOKIE,
        value: "jwt",
        options: expect.objectContaining({ maxAge: 900, httpOnly: true }),
      },
    ]);

    for (const session of [null, { access_token: "old", expires_at: 999_000 }]) {
      const cleared = fakeJar();
      writeAccessTokenCookie(cleared.jar, session, { secure: false }, 1_000_000);
      expect(cleared.calls).toEqual([
        { name: ACCESS_TOKEN_COOKIE, value: "", options: expect.objectContaining({ maxAge: 0 }) },
      ]);
    }
  });

  it("logout clears the access token and every Supabase session cookie, and nothing else", () => {
    const { jar, calls } = fakeJar([
      "sb-abc-auth-token.0",
      "sb-abc-auth-token.1",
      "sb-abc-auth-token-code-verifier",
      "fursa-theme",
      "NEXT_LOCALE",
    ]);
    clearAuthCookies(jar, { secure: false });
    expect(calls.map((c) => c.name).sort()).toEqual(
      [
        ACCESS_TOKEN_COOKIE,
        "sb-abc-auth-token.0",
        "sb-abc-auth-token.1",
        "sb-abc-auth-token-code-verifier",
      ].sort(),
    );
    expect(
      calls.every((c) => c.value === "" && c.options.maxAge === 0 && c.options.httpOnly === true),
    ).toBe(true);
  });
});

describe("mapAuthError", () => {
  it.each([
    [{ code: "invalid_credentials", status: 400 }, "invalid_credentials"],
    [{ code: "email_not_confirmed", status: 400 }, "email_not_confirmed"],
    [{ code: "user_already_exists", status: 422 }, "email_taken"],
    [{ code: "email_exists", status: 422 }, "email_taken"],
    [{ code: "weak_password", status: 422 }, "weak_password"],
    [{ code: "same_password", status: 422 }, "same_password"],
    [{ code: "over_email_send_rate_limit", status: 429 }, "rate_limited"],
    [{ status: 429 }, "rate_limited"],
    [{ code: "signup_disabled", status: 422 }, "signup_disabled"],
    [{ code: "refresh_token_not_found", status: 400 }, "session_missing"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "unavailable"],
    [{ status: 503 }, "unavailable"],
    [{ code: "something_new", status: 400 }, "unknown"],
    [null, "unknown"],
    ["text", "unknown"],
  ])("%j is %s", (error, key) => {
    expect(mapAuthError(error)).toBe(key);
  });
});

describe("form schemas", () => {
  const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
    result.error?.issues.map((i) => i.message) ?? [];

  it("login: a real email and any password", () => {
    expect(loginSchema.safeParse({ email: " a@b.co ", password: "x" }).success).toBe(true);
    expect(messages(loginSchema.safeParse({ email: "nope", password: "" }))).toEqual([
      "email_invalid",
      "password_required",
    ]);
  });

  it("signup and reset: 8 to 72 characters", () => {
    expect(signupSchema.safeParse({ email: "a@b.co", password: "12345678" }).success).toBe(true);
    expect(messages(signupSchema.safeParse({ email: "a@b.co", password: "1234567" }))).toEqual([
      "password_short",
    ]);
    expect(messages(signupSchema.safeParse({ email: "a@b.co", password: "x".repeat(73) }))).toEqual(
      ["password_long"],
    );
  });

  it("reset: the two passwords must match, and the error is on the second field", () => {
    expect(resetSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(true);
    const bad = resetSchema.safeParse({ password: "12345678", confirm: "123456789" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]).toMatchObject({ message: "password_mismatch", path: ["confirm"] });
  });

  it("forgot: an email", () => {
    expect(forgotSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotSchema.safeParse({ email: "" }).success).toBe(false);
  });
});
