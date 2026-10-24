/**
 * Errors from the Fursa API. Every error answers the same body,
 * `{"error": {"code", "message", "details"}}`, which becomes an `ApiError`.
 * The table below maps each code to a translated message and to what the UI does
 * (see "Errors" in fursa web.md).
 */

/** What the UI should do about an error. */
export type ErrorAction =
  /** Go to the login page. */
  | "login"
  /** Refresh the session once, then go to login. */
  | "refresh_then_login"
  /** Sign out, clear both cookies, say the account is gone. */
  | "sign_out"
  /** Wait the given seconds, then allow a retry. */
  | "wait"
  /** Reload the feed from the start. */
  | "reload_feed"
  /** Try again later; keep the user signed in. */
  | "retry_later"
  /** Show the message and let the user fix something. */
  | "show";

/** A field problem inside `details` for a 422. */
export type FieldProblem = {
  /** Where: ["body", "salary_min"], ["query", "limit"]... */
  loc: (string | number)[];
  msg: string;
};

/**
 * Codes the API returns today (the ones in fursa web.md, plus `internal_error` for a 500),
 * and `network_error`, which this app adds for a request that got no answer.
 */
export const ERROR_CODES = {
  missing_token: { status: 401, action: "login" },
  invalid_token: { status: 401, action: "login" },
  token_expired: { status: 401, action: "refresh_then_login" },
  account_deleted: { status: 403, action: "sign_out" },
  email_required: { status: 403, action: "show" },
  origin_not_allowed: { status: 403, action: "show" },
  validation_error: { status: 422, action: "show" },
  invalid_salary_range: { status: 422, action: "show" },
  invalid_cursor: { status: 400, action: "reload_feed" },
  job_not_found: { status: 404, action: "show" },
  telegram_not_linked: { status: 422, action: "show" },
  telegram_not_configured: { status: 503, action: "show" },
  rate_limited: { status: 429, action: "wait" },
  auth_unavailable: { status: 503, action: "retry_later" },
  auth_not_configured: { status: 503, action: "retry_later" },
  internal_error: { status: 500, action: "retry_later" },
  network_error: { status: 0, action: "retry_later" },
} as const satisfies Record<string, { status: number; action: ErrorAction }>;

export type KnownErrorCode = keyof typeof ERROR_CODES;

export function isKnownErrorCode(code: string): code is KnownErrorCode {
  return Object.hasOwn(ERROR_CODES, code);
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  /** For a 429: how many seconds to wait. */
  readonly retryAfterSeconds: number | null;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
    retryAfterSeconds?: number | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }

  /** What the UI should do. Unknown codes are shown as they are. */
  get action(): ErrorAction {
    return isKnownErrorCode(this.code) ? ERROR_CODES[this.code].action : "show";
  }

  /** The field problems of a 422, if `details` has them. */
  get fieldProblems(): FieldProblem[] {
    return Array.isArray(this.details) ? this.details.filter(isFieldProblem) : [];
  }
}

function isFieldProblem(value: unknown): value is FieldProblem {
  if (typeof value !== "object" || value === null) return false;
  const { loc, msg } = value as Record<string, unknown>;
  return Array.isArray(loc) && typeof msg === "string";
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.ceil(n) : null;
}

/** Seconds to wait after a 429: the Retry-After header, or details.retry_after_seconds. */
export function retryAfterSeconds(headers: Headers, details: unknown): number | null {
  const fromHeader = positiveInt(headers.get("retry-after"));
  if (fromHeader !== null) return fromHeader;
  if (typeof details === "object" && details !== null && !Array.isArray(details)) {
    return positiveInt((details as Record<string, unknown>).retry_after_seconds);
  }
  return null;
}

/**
 * Builds an ApiError from a failed response. `body` is the parsed JSON, or anything if the
 * body was not JSON (a proxy error page, for instance): the status is still reported.
 */
export function toApiError(response: Response, body: unknown): ApiError {
  const error =
    typeof body === "object" && body !== null && "error" in body
      ? (body as { error: unknown }).error
      : null;

  if (typeof error === "object" && error !== null) {
    const { code, message, details } = error as Record<string, unknown>;
    if (typeof code === "string") {
      return new ApiError({
        status: response.status,
        code,
        message: typeof message === "string" ? message : code,
        details,
        retryAfterSeconds:
          response.status === 429 ? retryAfterSeconds(response.headers, details) : null,
      });
    }
  }

  return new ApiError({
    status: response.status,
    code: `http_${response.status}`,
    message: response.statusText || `HTTP ${response.status}`,
    retryAfterSeconds: response.status === 429 ? retryAfterSeconds(response.headers, null) : null,
  });
}

/** The error for a request that never got an answer (offline, refused, blocked). */
export function networkError(cause: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: "network_error",
    message: cause instanceof Error ? cause.message : "Network error",
  });
}

/** A translator like next-intl's `t`, kept loose so this file needs no i18n import. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export type DescribedError = {
  /** A translated sentence for the user. */
  message: string;
  /** The technical code, to show small underneath (and in the dev console). */
  code: string;
  action: ErrorAction;
  /** For a 429: seconds to wait (for the countdown). */
  retryAfterSeconds: number | null;
};

/**
 * Turns any error into a translated message. `t` is the translator for the "errors"
 * namespace. An unknown code keeps the API's own message and shows the code.
 */
export function describeError(error: unknown, t: Translate): DescribedError {
  if (!(error instanceof ApiError)) {
    return { message: t("unknown"), code: "unknown", action: "show", retryAfterSeconds: null };
  }
  if (isKnownErrorCode(error.code)) {
    const seconds = error.retryAfterSeconds;
    // A 429 without a wait time still gets a sentence (the one with {seconds} needs the number).
    const key =
      error.code === "rate_limited" && seconds === null ? "rate_limited_soon" : error.code;
    return {
      message: t(key, seconds === null ? undefined : { seconds }),
      code: error.code,
      action: error.action,
      retryAfterSeconds: seconds,
    };
  }
  return {
    message: error.message || t("unknown"),
    code: error.code,
    action: "show",
    retryAfterSeconds: error.retryAfterSeconds,
  };
}
