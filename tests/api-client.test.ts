// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ApiError, call, createApiClient } from "@/lib/api";

const BASE = "http://api.test";

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const error = (code: string, status: number, details: unknown = null, headers = {}) =>
  json(status, { error: { code, message: `message for ${code}`, details } }, headers);

function setup(...responses: (Response | Error)[]) {
  const queue = [...responses];
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected extra request");
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetchMock, requests: () => fetchMock.mock.calls.map(([request]) => request) };
}

describe("createApiClient", () => {
  it("sends cookies with every call and uses the base URL", async () => {
    const { fetchMock, requests } = setup(json(200, { id: "u1", email: "a@b.c", locale: "en" }));
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    const me = await call(api.GET("/v1/me"));

    expect(me).toMatchObject({ id: "u1" });
    expect(requests()[0]?.url).toBe(`${BASE}/v1/me`);
    expect(requests()[0]?.credentials).toBe("include");
  });

  it("builds typed paths, queries and bodies from the contract", async () => {
    const { fetchMock, requests } = setup(
      json(200, { items: [], next_cursor: null }),
      json(200, { id: "j1" }),
    );
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    await call(api.GET("/v1/feed", { params: { query: { status: "saved", limit: 5 } } }));
    await call(
      api.PUT("/v1/jobs/{job_id}/status", {
        params: { path: { job_id: "j1" } },
        body: { status: "applied" },
      }),
    );

    const [feed, status] = requests();
    expect(new URL(feed?.url ?? "").searchParams.get("status")).toBe("saved");
    expect(new URL(feed?.url ?? "").searchParams.get("limit")).toBe("5");
    expect(status?.url).toBe(`${BASE}/v1/jobs/j1/status`);
    expect(status?.method).toBe("PUT");
    expect(await status?.json()).toEqual({ status: "applied" });
  });

  it("returns nothing for a 204 (account deletion)", async () => {
    const { fetchMock } = setup(new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });
    await expect(call(api.DELETE("/v1/account"))).resolves.toBeUndefined();
  });
});

describe("call: errors", () => {
  it("throws an ApiError with the code, message, status and field problems", async () => {
    const problems = [{ loc: ["body", "salary_min"], msg: "too high" }];
    const { fetchMock } = setup(error("validation_error", 422, problems));
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    const failure = await call(api.PATCH("/v1/profile", { body: {} })).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    const apiError = failure as ApiError;
    expect(apiError).toMatchObject({ status: 422, code: "validation_error" });
    expect(apiError.fieldProblems).toEqual(problems);
  });

  it("reads the wait of a 429 from Retry-After", async () => {
    const { fetchMock } = setup(
      error("rate_limited", 429, { retry_after_seconds: 30 }, { "retry-after": "12" }),
    );
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    const failure = (await call(api.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;

    expect(failure.code).toBe("rate_limited");
    expect(failure.retryAfterSeconds).toBe(12);
    expect(failure.action).toBe("wait");
  });

  it("reports a non-JSON error (a proxy page) with its status", async () => {
    const { fetchMock } = setup(
      new Response("<html>Bad gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    const failure = (await call(api.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;

    expect(failure).toMatchObject({ status: 502, code: "http_502" });
  });

  it("turns a request that never got an answer into a network_error", async () => {
    const { fetchMock } = setup(new TypeError("fetch failed"));
    const api = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });

    const failure = (await call(api.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 0, code: "network_error", action: "retry_later" });
  });
});

describe("token_expired", () => {
  it("refreshes once, then sends the request again", async () => {
    const { fetchMock, requests } = setup(
      error("token_expired", 401),
      json(200, { id: "u1", email: "a@b.c", locale: "en" }),
    );
    const onTokenExpired = vi.fn().mockResolvedValue(true);
    const api = createApiClient({
      baseUrl: BASE,
      fetch: fetchMock as unknown as typeof fetch,
      onTokenExpired,
    });

    const me = await call(api.GET("/v1/me"));

    expect(me).toMatchObject({ id: "u1" });
    expect(onTokenExpired).toHaveBeenCalledTimes(1);
    expect(requests()).toHaveLength(2);
    expect(requests()[1]?.credentials).toBe("include");
  });

  it("repeats a request that has a body", async () => {
    const { fetchMock, requests } = setup(error("token_expired", 401), json(200, { id: "j1" }));
    const api = createApiClient({
      baseUrl: BASE,
      fetch: fetchMock as unknown as typeof fetch,
      onTokenExpired: async () => true,
    });

    await call(
      api.PUT("/v1/jobs/{job_id}/status", {
        params: { path: { job_id: "j1" } },
        body: { status: "saved" },
      }),
    );

    expect(await requests()[1]?.json()).toEqual({ status: "saved" });
  });

  it("does not loop: a second token_expired is passed on", async () => {
    const { fetchMock } = setup(error("token_expired", 401), error("token_expired", 401));
    const onTokenExpired = vi.fn().mockResolvedValue(true);
    const api = createApiClient({
      baseUrl: BASE,
      fetch: fetchMock as unknown as typeof fetch,
      onTokenExpired,
    });

    const failure = (await call(api.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;

    expect(failure.code).toBe("token_expired");
    expect(onTokenExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes the error on when the refresh fails or there is no refresh", async () => {
    const failing = setup(error("token_expired", 401));
    const withFailingRefresh = createApiClient({
      baseUrl: BASE,
      fetch: failing.fetchMock as unknown as typeof fetch,
      onTokenExpired: async () => false,
    });
    const first = (await call(withFailingRefresh.GET("/v1/me")).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(first.code).toBe("token_expired");
    expect(failing.fetchMock).toHaveBeenCalledTimes(1);

    const none = setup(error("token_expired", 401));
    const withoutRefresh = createApiClient({
      baseUrl: BASE,
      fetch: none.fetchMock as unknown as typeof fetch,
    });
    const second = (await call(withoutRefresh.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;
    expect(second.code).toBe("token_expired");
    expect(none.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores other 401 codes (invalid_token goes to login, no refresh)", async () => {
    const { fetchMock } = setup(error("invalid_token", 401));
    const onTokenExpired = vi.fn().mockResolvedValue(true);
    const api = createApiClient({
      baseUrl: BASE,
      fetch: fetchMock as unknown as typeof fetch,
      onTokenExpired,
    });

    const failure = (await call(api.GET("/v1/me")).catch((e: unknown) => e)) as ApiError;

    expect(failure.action).toBe("login");
    expect(onTokenExpired).not.toHaveBeenCalled();
  });
});
