// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ApiError,
  describeError,
  ERROR_CODES,
  isKnownErrorCode,
  networkError,
  toApiError,
  type Translate,
} from "@/lib/api/errors";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

/** A translator over the real English messages, filling {seconds}. */
const t: Translate = (key, values) => {
  const text = (en.errors as Record<string, string>)[key] ?? `MISSING:${key}`;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
};

describe("toApiError", () => {
  it("reads the shared error body: code, message and details", () => {
    const error = toApiError(response(404), {
      error: { code: "job_not_found", message: "No such job", details: null },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "job_not_found", message: "No such job" });
    expect(error.action).toBe("show");
  });

  it("exposes the field problems of a 422 (loc and msg)", () => {
    const error = toApiError(response(422), {
      error: {
        code: "validation_error",
        message: "Invalid",
        details: [
          { loc: ["body", "salary_min"], msg: "must be positive", type: "value_error" },
          { loc: ["body", "locale"], msg: "not allowed" },
          "not a problem",
        ],
      },
    });
    expect(error.fieldProblems).toEqual([
      { loc: ["body", "salary_min"], msg: "must be positive", type: "value_error" },
      { loc: ["body", "locale"], msg: "not allowed" },
    ]);
  });

  it("takes the wait of a 429 from Retry-After first", () => {
    const error = toApiError(response(429, { "retry-after": "12" }), {
      error: { code: "rate_limited", message: "Slow down", details: { retry_after_seconds: 30 } },
    });
    expect(error.retryAfterSeconds).toBe(12);
    expect(error.action).toBe("wait");
  });

  it("falls back to details.retry_after_seconds, and to null", () => {
    const fromDetails = toApiError(response(429), {
      error: { code: "rate_limited", message: "Slow down", details: { retry_after_seconds: 7 } },
    });
    expect(fromDetails.retryAfterSeconds).toBe(7);

    const unknown = toApiError(response(429), {
      error: { code: "rate_limited", message: "Slow down", details: null },
    });
    expect(unknown.retryAfterSeconds).toBeNull();
  });

  it("still reports the status when the body is not the API's error shape", () => {
    const html = toApiError(response(502), "<html>Bad gateway</html>");
    expect(html).toMatchObject({ status: 502, code: "http_502" });
    const empty = toApiError(response(500), null);
    expect(empty).toMatchObject({ status: 500, code: "http_500" });
  });

  it("does not read a retry wait from a status other than 429", () => {
    const error = toApiError(response(503, { "retry-after": "5" }), {
      error: { code: "auth_unavailable", message: "Down", details: null },
    });
    expect(error.retryAfterSeconds).toBeNull();
  });
});

describe("error codes", () => {
  it("covers every code listed in fursa web.md, with the action the UI takes", () => {
    const expected: Record<string, string> = {
      missing_token: "login",
      invalid_token: "login",
      token_expired: "refresh_then_login",
      account_deleted: "sign_out",
      email_required: "show",
      origin_not_allowed: "show",
      validation_error: "show",
      invalid_salary_range: "show",
      invalid_cursor: "reload_feed",
      job_not_found: "show",
      telegram_not_linked: "show",
      telegram_not_configured: "show",
      rate_limited: "wait",
      auth_unavailable: "retry_later",
      auth_not_configured: "retry_later",
    };
    for (const [code, action] of Object.entries(expected)) {
      expect(isKnownErrorCode(code), code).toBe(true);
      expect(ERROR_CODES[code as keyof typeof ERROR_CODES].action, code).toBe(action);
    }
  });

  it("an unknown code is shown as it is", () => {
    const error = new ApiError({ status: 418, code: "teapot", message: "I am a teapot" });
    expect(error.action).toBe("show");
    expect(describeError(error, t)).toMatchObject({ message: "I am a teapot", code: "teapot" });
  });

  it.each([
    ["en", en],
    ["fr", fr],
    ["ar", ar],
  ])("%s has a message for every code, and for the fallbacks", (_locale, messages) => {
    for (const code of Object.keys(ERROR_CODES)) {
      expect((messages.errors as Record<string, string>)[code], code).toBeTruthy();
    }
    expect(messages.errors.unknown).toBeTruthy();
    expect(messages.errors.rate_limited_soon).toBeTruthy();
  });

  it.each([
    ["en", en],
    ["fr", fr],
    ["ar", ar],
  ])("%s rate limit message has the {seconds} placeholder", (_locale, messages) => {
    expect(messages.errors.rate_limited).toContain("{seconds}");
    expect(messages.errors.rate_limited_soon).not.toContain("{seconds}");
  });
});

describe("describeError", () => {
  it("translates a known code and fills the wait of a 429", () => {
    const error = new ApiError({
      status: 429,
      code: "rate_limited",
      message: "x",
      retryAfterSeconds: 12,
    });
    expect(describeError(error, t)).toEqual({
      message: "Too many requests. Try again in 12 seconds.",
      code: "rate_limited",
      action: "wait",
      retryAfterSeconds: 12,
    });
  });

  it("uses a sentence without a number when a 429 gives no wait", () => {
    const error = new ApiError({ status: 429, code: "rate_limited", message: "x" });
    expect(describeError(error, t).message).toBe("Too many requests. Try again in a moment.");
  });

  it("describes a lost connection and anything that is not an ApiError", () => {
    expect(describeError(networkError(new TypeError("fetch failed")), t)).toMatchObject({
      code: "network_error",
      action: "retry_later",
    });
    expect(describeError(new Error("boom"), t)).toMatchObject({
      message: "Something went wrong. Try again.",
      code: "unknown",
    });
  });
});
