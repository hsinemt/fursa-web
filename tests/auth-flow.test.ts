// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The real Supabase client and the real server actions, against a small fake Supabase
 * server. What it proves: which cookies are written, with which flags, and that they are
 * written, refreshed and cleared together.
 */

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  calls: [] as { name: string; value: string; options: Record<string, unknown> }[],
  headers: new Headers(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...state.cookies].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      state.calls.push({ name, value, options });
      if (options?.maxAge === 0) state.cookies.delete(name);
      else state.cookies.set(name, value);
    },
  }),
  headers: async () => state.headers,
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/i18n/navigation", () => ({
  redirect: (args: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(args)}`);
  },
}));

import { GET as callback } from "@/app/[locale]/auth/callback/route";
import { authenticate } from "@/lib/auth/proxy";
import {
  refreshSession,
  requestPasswordResetAction,
  signInAction,
  signOutAction,
  signUpAction,
} from "@/lib/auth/actions";

// ---- the fake Supabase ------------------------------------------------------------------

type Seen = { method: string; path: string; query: URLSearchParams; body: Record<string, unknown> };
const seen: Seen[] = [];
const behavior = {
  password: "right-password",
  refreshOk: true,
  pkceOk: true,
  signUpReturnsSession: true,
  recover: { status: 200, code: "" },
};

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const user = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "a@b.co",
  app_metadata: {},
  user_metadata: { locale: "en" },
  created_at: "2026-01-01T00:00:00Z",
};

function makeSession(ttl: number, refresh: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    aud: "authenticated",
    role: "authenticated",
    iat: now,
    exp: now + ttl,
    session_id: "s1",
  };
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2ln`,
    token_type: "bearer",
    expires_in: ttl,
    expires_at: now + ttl,
    refresh_token: refresh,
    user,
  };
}

const fail = (status: number, code: string) => ({
  status,
  body: { code: status, error_code: code, msg: code },
});

let server: Server;

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://fake");
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      seen.push({ method: req.method ?? "", path: url.pathname, query: url.searchParams, body });

      let out: { status: number; body?: unknown } = {
        status: 404,
        body: { code: 404, error_code: "not_found", msg: "no" },
      };
      const route = `${req.method} ${url.pathname}`;
      const grant = url.searchParams.get("grant_type");

      if (route === "POST /auth/v1/token" && grant === "password") {
        out =
          body.password === behavior.password
            ? { status: 200, body: makeSession(3600, "refresh-1") }
            : fail(400, "invalid_credentials");
      } else if (route === "POST /auth/v1/token" && grant === "pkce") {
        out = behavior.pkceOk
          ? { status: 200, body: makeSession(3600, "refresh-1") }
          : fail(400, "flow_state_not_found");
      } else if (route === "POST /auth/v1/token" && grant === "refresh_token") {
        out = behavior.refreshOk
          ? { status: 200, body: makeSession(3500, "refresh-2") }
          : fail(400, "refresh_token_not_found");
      } else if (route === "POST /auth/v1/signup") {
        out = {
          status: 200,
          body: behavior.signUpReturnsSession ? makeSession(3600, "refresh-1") : user,
        };
      } else if (route === "POST /auth/v1/recover") {
        out =
          behavior.recover.status === 200
            ? { status: 200, body: {} }
            : fail(behavior.recover.status, behavior.recover.code);
      } else if (route === "GET /auth/v1/user" || route === "PUT /auth/v1/user") {
        out = { status: 200, body: user };
      } else if (route === "POST /auth/v1/logout") {
        out = { status: 204 };
      }
      res.writeHead(out.status, { "content-type": "application/json" });
      res.end(out.body === undefined ? undefined : JSON.stringify(out.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.AUTH_COOKIE_DOMAIN;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  state.cookies.clear();
  state.calls.length = 0;
  state.headers = new Headers();
  seen.length = 0;
  behavior.password = "right-password";
  behavior.refreshOk = true;
  behavior.pkceOk = true;
  behavior.signUpReturnsSession = true;
  behavior.recover = { status: 200, code: "" };
});

const login = (extra: Record<string, unknown> = {}) =>
  signInAction({ email: "a@b.co", password: "right-password", locale: "en", ...extra });
const accessCookies = () => state.calls.filter((c) => c.name === "fursa_access_token");
const sessionCookies = () => state.calls.filter((c) => c.name.startsWith("sb-"));
const cookieHeader = () => [...state.cookies].map(([name, value]) => `${name}=${value}`).join("; ");

// ---- login ------------------------------------------------------------------------------

describe("sign in: the cookies", () => {
  it("writes both cookies, HttpOnly and SameSite=Lax, not Secure on http", async () => {
    expect(await login()).toEqual({ ok: true, next: "/feed" });

    const [token] = accessCookies();
    expect(token?.value.split(".")).toHaveLength(3);
    expect(token?.options).toMatchObject({
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    expect(token?.options.maxAge).toBeGreaterThan(3500);
    expect(token?.options.maxAge).toBeLessThanOrEqual(3600);
    expect(token?.options).not.toHaveProperty("domain");

    expect(sessionCookies().length).toBeGreaterThan(0);
    for (const cookie of sessionCookies()) {
      expect(cookie.options, cookie.name).toMatchObject({
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });
    }
  });

  it("is Secure over https (X-Forwarded-Proto), on both kinds of cookie", async () => {
    state.headers = new Headers({ "x-forwarded-proto": "https" });
    await login();
    expect(accessCookies()[0]?.options.secure).toBe(true);
    expect(sessionCookies().every((c) => c.options.secure === true)).toBe(true);
  });

  it("shares the access token with the API's domain in production (AUTH_COOKIE_DOMAIN)", async () => {
    process.env.AUTH_COOKIE_DOMAIN = ".fursa.test";
    try {
      await login();
    } finally {
      delete process.env.AUTH_COOKIE_DOMAIN;
    }
    expect(accessCookies()[0]?.options.domain).toBe(".fursa.test");
    expect(sessionCookies().every((c) => !("domain" in c.options))).toBe(true);
  });

  it("the cookie holds the raw token, the one the API verifies", async () => {
    await login();
    const [header, payload] = (accessCookies()[0]?.value ?? "").split(".");
    expect(JSON.parse(Buffer.from(header ?? "", "base64url").toString()).alg).toBe("HS256");
    expect(JSON.parse(Buffer.from(payload ?? "", "base64url").toString()).sub).toBe("user-1");
  });
});

describe("sign in: answers", () => {
  it("a wrong password is reported, and no access token is written", async () => {
    const result = await signInAction({ email: "a@b.co", password: "wrong", locale: "en" });
    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(accessCookies()).toEqual([]);
    expect(state.cookies.size).toBe(0);
  });

  it("checks the form on the server too, before asking Supabase", async () => {
    const result = await signInAction({ email: "nope", password: "", locale: "en" });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { email: "email_invalid", password: "password_required" },
    });
    expect(seen).toEqual([]);
    expect(await signInAction({ email: "a@b.co", password: "x", locale: "xx" })).toMatchObject({
      ok: false,
    });
  });

  it("goes to `next` only when it is a page of this site", async () => {
    expect(await login({ next: "/jobs/3" })).toEqual({ ok: true, next: "/jobs/3" });
    state.cookies.clear();
    expect(await login({ next: "https://evil.example" })).toEqual({ ok: true, next: "/feed" });
    expect(await login({ next: "//evil.example" })).toEqual({ ok: true, next: "/feed" });
  });

  it("says login is not set up when the Supabase settings are missing", async () => {
    const url = process.env.SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    try {
      expect(await login()).toEqual({ ok: false, error: "not_configured" });
    } finally {
      process.env.SUPABASE_URL = url;
    }
  });
});

// ---- sign up ----------------------------------------------------------------------------

const person = { firstName: "Amel", lastName: "Ben Salah" };

describe("sign up", () => {
  it("sends the language, and the link back to this site in that language", async () => {
    behavior.signUpReturnsSession = false;
    const result = await signUpAction({
      ...person,
      email: "a@b.co",
      password: "12345678",
      locale: "ar",
    });

    expect(result).toEqual({ ok: true, next: "/check-email" });
    const request = seen.find((s) => s.path === "/auth/v1/signup");
    // The language for the API, and the name saved with the account.
    expect(request?.body.data).toEqual({
      locale: "ar",
      first_name: "Amel",
      last_name: "Ben Salah",
    });
    expect(request?.query.get("redirect_to")).toBe(
      "http://localhost:3000/ar/auth/callback?next=%2Ffeed",
    );
    expect(accessCookies()).toEqual([]); // not signed in until the email is confirmed
  });

  it("signs in at once when Supabase does not ask for confirmation", async () => {
    const result = await signUpAction({
      ...person,
      email: "a@b.co",
      password: "12345678",
      locale: "fr",
    });
    expect(result).toEqual({ ok: true, next: "/feed" });
    expect(accessCookies()).toHaveLength(1);
    expect(accessCookies()[0]?.options).toMatchObject({ httpOnly: true, sameSite: "lax" });
  });

  it("asks for both names on the server too", async () => {
    expect(
      await signUpAction({
        firstName: "",
        lastName: "Doe",
        email: "a@b.co",
        password: "12345678",
        locale: "en",
      }),
    ).toMatchObject({ ok: false, fieldErrors: { firstName: "name_required" } });
    expect(seen).toEqual([]);
  });

  it("rejects a short password on the server", async () => {
    expect(
      await signUpAction({ ...person, email: "a@b.co", password: "1234567", locale: "en" }),
    ).toMatchObject({
      ok: false,
      fieldErrors: { password: "password_short" },
    });
    expect(seen).toEqual([]);
  });
});

// ---- forgot password --------------------------------------------------------------------

describe("forgot password", () => {
  it("asks for a link that comes back to the reset page of this site", async () => {
    expect(await requestPasswordResetAction({ email: "a@b.co", locale: "fr" })).toEqual({
      ok: true,
      next: null,
    });
    const request = seen.find((s) => s.path === "/auth/v1/recover");
    expect(request?.query.get("redirect_to")).toBe(
      "http://localhost:3000/fr/auth/callback?next=%2Freset-password",
    );
  });

  it("answers the same when the account does not exist (nobody can look accounts up)", async () => {
    behavior.recover = { status: 400, code: "user_not_found" };
    expect(await requestPasswordResetAction({ email: "nobody@b.co", locale: "en" })).toEqual({
      ok: true,
      next: null,
    });
  });

  it("reports only a refusal to send: too many requests, or the service down", async () => {
    behavior.recover = { status: 429, code: "over_email_send_rate_limit" };
    expect(await requestPasswordResetAction({ email: "a@b.co", locale: "en" })).toEqual({
      ok: false,
      error: "rate_limited",
    });
    behavior.recover = { status: 503, code: "unexpected_failure" };
    expect(await requestPasswordResetAction({ email: "a@b.co", locale: "en" })).toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

// ---- sign out and refresh ---------------------------------------------------------------

describe("sign out", () => {
  it("ends the session, clears both kinds of cookies, and goes to the login page", async () => {
    await login();
    expect(state.cookies.has("fursa_access_token")).toBe(true);
    state.calls.length = 0;

    await expect(signOutAction()).rejects.toThrow(
      `NEXT_REDIRECT ${JSON.stringify({ href: { pathname: "/login", query: { notice: "signed_out" } }, locale: "fr" })}`,
    );

    expect(seen.some((s) => s.path === "/auth/v1/logout")).toBe(true);
    expect(state.cookies.size).toBe(0);
    const cleared = state.calls.filter((c) => c.options.maxAge === 0).map((c) => c.name);
    expect(cleared).toContain("fursa_access_token");
    expect(cleared.some((name) => name.startsWith("sb-"))).toBe(true);
  });

  it("clears the cookies even when Supabase cannot be reached", async () => {
    await login();
    const url = process.env.SUPABASE_URL;
    process.env.SUPABASE_URL = "http://127.0.0.1:1"; // nothing listens here
    try {
      await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");
      expect(state.cookies.size).toBe(0);
    } finally {
      process.env.SUPABASE_URL = url;
    }
  });
});

describe("refreshSession (called when the API says token_expired)", () => {
  it("gets a new token and updates both cookies together", async () => {
    await login();
    const first = state.cookies.get("fursa_access_token");
    state.calls.length = 0;

    expect(await refreshSession()).toBe(true);

    const [token] = accessCookies();
    expect(token?.value).not.toBe(first);
    expect(token?.options.maxAge).toBeLessThanOrEqual(3500);
    expect(token?.options).toMatchObject({ httpOnly: true, sameSite: "lax" });
    expect(sessionCookies().length).toBeGreaterThan(0);
  });

  it("clears the session when the refresh token no longer works", async () => {
    await login();
    behavior.refreshOk = false;
    expect(await refreshSession()).toBe(false);
    expect(state.cookies.size).toBe(0);
  });

  it("is false when login is not set up", async () => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    try {
      expect(await refreshSession()).toBe(false);
    } finally {
      process.env.SUPABASE_PUBLISHABLE_KEY = key;
    }
  });
});

// ---- the proxy --------------------------------------------------------------------------

function pageRequest(url = "http://localhost:3000/en/feed", cookie = cookieHeader()) {
  return new NextRequest(url, { headers: cookie ? { cookie } : {} });
}

describe("proxy: authenticate", () => {
  it("a valid session is signed in, and the access token cookie is kept for the API", async () => {
    await login();
    const response = NextResponse.next();
    expect(await authenticate(pageRequest(), response)).toEqual({
      configured: true,
      signedIn: true,
    });

    const token = response.cookies.get("fursa_access_token");
    expect(token?.value).toBe(state.cookies.get("fursa_access_token"));
    expect(token).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: false });
  });

  it("refreshes an expired access token and rewrites both cookies", async () => {
    await login();
    const before = state.cookies.get("fursa_access_token");
    // Two hours later the token has expired; the refresh token still works.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 3600 * 1000 });
    try {
      const response = NextResponse.next();
      const result = await authenticate(pageRequest(), response);

      expect(result.signedIn).toBe(true);
      expect(seen.some((s) => s.query.get("grant_type") === "refresh_token")).toBe(true);
      const token = response.cookies.get("fursa_access_token");
      expect(token?.value.split(".")).toHaveLength(3);
      expect(token?.value).not.toBe(before);
      expect(token).toMatchObject({ httpOnly: true, sameSite: "lax" });
      expect(response.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.httpOnly)).toBe(
        true,
      );
      // The response must not be cached by a CDN: it carries a session.
      expect(response.headers.get("cache-control")).toContain("no-store");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a session that can no longer be refreshed is signed out, and the token cookie is cleared", async () => {
    await login();
    behavior.refreshOk = false;
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 3600 * 1000 });
    try {
      const response = NextResponse.next();
      expect(await authenticate(pageRequest(), response)).toEqual({
        configured: true,
        signedIn: false,
      });
      expect(response.cookies.get("fursa_access_token")).toMatchObject({ value: "", maxAge: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes a leftover access token when there is no session behind it", async () => {
    const response = NextResponse.next();
    const request = pageRequest(
      "http://localhost:3000/en/feed",
      "fursa_access_token=stale; fursa-theme=dark",
    );

    expect(await authenticate(request, response)).toEqual({ configured: true, signedIn: false });
    expect(response.cookies.get("fursa_access_token")).toMatchObject({ value: "", maxAge: 0 });
    expect(response.cookies.get("fursa-theme")).toBeUndefined();
    expect(seen).toEqual([]); // no session cookie: Supabase is not even called
  });

  it("is Secure for an https site", async () => {
    await login();
    const response = NextResponse.next();
    await authenticate(pageRequest("https://fursa.test/en/feed"), response);
    expect(response.cookies.get("fursa_access_token")?.secure).toBe(true);
  });

  it("does nothing, and reports it, when login is not set up", async () => {
    const url = process.env.SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    try {
      expect(await authenticate(pageRequest(), NextResponse.next())).toEqual({
        configured: false,
        signedIn: false,
      });
    } finally {
      process.env.SUPABASE_URL = url;
    }
  });
});

// ---- the link in a confirmation or reset email ------------------------------------------

describe("email link callback", () => {
  // The cookie Supabase set when the person asked for the email (named after the project).
  const VERIFIER = "sb-127-auth-token-code-verifier";
  const route = { params: Promise.resolve({ locale: "ar" }) };
  const open = (query: string) =>
    callback(new NextRequest(`http://localhost:3000/ar/auth/callback?${query}`), route);

  beforeEach(() => {
    state.cookies.set(VERIFIER, JSON.stringify("v".repeat(50)));
  });

  it("signs the person in, writes both cookies, and goes to the page in their language", async () => {
    const response = await open("code=abc&next=%2Freset-password");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/ar/reset-password");
    expect(accessCookies()[0]?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(sessionCookies().some((c) => c.name === "sb-127-auth-token")).toBe(true);
    expect(state.cookies.has(VERIFIER)).toBe(false); // used once, then removed
  });

  it("the redirect cannot be cached by a CDN or a proxy: it carries a session", async () => {
    const response = await open("code=abc");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("goes to the feed by default, and never to another site", async () => {
    expect((await open("code=abc")).headers.get("location")).toBe("http://localhost:3000/ar/feed");
    state.cookies.set(VERIFIER, JSON.stringify("v".repeat(50)));
    expect((await open("code=abc&next=https%3A%2F%2Fevil.example")).headers.get("location")).toBe(
      "http://localhost:3000/ar/feed",
    );
  });

  it("a link with no code goes back to sign in, with a message, and signs nobody in", async () => {
    const response = await open("next=%2Ffeed");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/ar/login?notice=link_invalid",
    );
    expect(accessCookies()).toEqual([]);
  });

  it("an expired or used link goes back to sign in, with a message, and signs nobody in", async () => {
    behavior.pkceOk = false;
    const response = await open("code=expired");
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/ar/login?notice=link_invalid",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(accessCookies()).toEqual([]);
  });
});
