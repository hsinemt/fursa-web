// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { endpointById } from "@/lib/dev/endpoints";
import { buildQuery, jobIdsFrom, runEndpoint, toLogLine, type RunInputs } from "@/lib/dev/run";

const BASE = "http://api.test";

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function setup(...responses: (Response | Error)[]) {
  const queue = [...responses];
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("unexpected request");
    if (next instanceof Error) throw next;
    return next;
  });
  const client = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });
  return { client, fetchMock, request: () => fetchMock.mock.calls[0]?.[0] as Request };
}

const empty: RunInputs = { path: {}, query: {}, body: "" };
// A clock that moves 42 ms per reading: the runner reads it twice, so the duration is 42.
const clock = () => {
  let t = 1000;
  return () => (t += 42);
};

describe("runEndpoint: building the call", () => {
  it("fills the path and sends the query: empty values are left out, numbers are numbers", async () => {
    const { client, request } = setup(json(200, { items: [], next_cursor: null }));
    const feed = endpointById("GET /v1/feed");

    const result = await runEndpoint(
      feed,
      { ...empty, query: { status: "saved", limit: "5", cursor: "  " } },
      client,
    );

    expect(result).toMatchObject({ sent: true, ok: true, status: 200 });
    const url = new URL(request().url);
    expect(url.pathname).toBe("/v1/feed");
    expect(Object.fromEntries(url.searchParams)).toEqual({ status: "saved", limit: "5" });
    expect(request().credentials).toBe("include");
  });

  it("fills {job_id} in the path and sends the JSON body", async () => {
    const { client, request } = setup(json(200, { id: "j1" }));
    const put = endpointById("PUT /v1/jobs/{job_id}/status");

    await runEndpoint(
      put,
      { ...empty, path: { job_id: " j1 " }, body: '{"status":"applied"}' },
      client,
    );

    expect(request().url).toBe(`${BASE}/v1/jobs/j1/status`);
    expect(request().method).toBe("PUT");
    expect(await request().json()).toEqual({ status: "applied" });
  });

  it("buildQuery ignores fields that are not in the endpoint", () => {
    expect(
      buildQuery(endpointById("GET /v1/feed"), { status: "new", other: "x", limit: "20" }),
    ).toEqual({
      status: "new",
      limit: 20,
    });
  });
});

describe("runEndpoint: refuses before sending", () => {
  it("a missing path parameter", async () => {
    const { client, fetchMock } = setup();
    const result = await runEndpoint(endpointById("GET /v1/jobs/{job_id}"), empty, client);
    expect(result).toMatchObject({ sent: false, error: { code: "missing_input" } });
    expect(result.sent === false && result.error.message).toContain("job_id");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a body that is not JSON, saying what is wrong", async () => {
    const { client, fetchMock } = setup();
    const result = await runEndpoint(
      endpointById("PATCH /v1/settings"),
      { ...empty, body: '{"locale": ' },
      client,
    );
    expect(result).toMatchObject({ sent: false, error: { code: "invalid_json" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a number field that is not a number", async () => {
    const { client, fetchMock } = setup();
    const result = await runEndpoint(
      endpointById("GET /v1/feed"),
      { ...empty, query: { limit: "many" } },
      client,
    );
    expect(result).toMatchObject({ sent: false, error: { code: "invalid_input" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("runEndpoint: what came back", () => {
  it("reports status, duration and the body as returned", async () => {
    const { client } = setup(json(200, { id: "u1", email: "a@b.co", locale: "en" }));
    const result = await runEndpoint(endpointById("GET /v1/me"), empty, client, clock());
    expect(result).toEqual({
      sent: true,
      ok: true,
      status: 200,
      ms: 42,
      body: { id: "u1", email: "a@b.co", locale: "en" },
      error: null,
    });
  });

  it("a 204 has no body", async () => {
    const { client } = setup(new Response(null, { status: 204 }));
    const del = endpointById("DELETE /v1/notifications/telegram");
    expect(await runEndpoint(del, empty, client)).toMatchObject({
      sent: true,
      ok: true,
      status: 204,
      body: null,
    });
  });

  it("an API error keeps the code, message, details and the error body as returned", async () => {
    const details = [{ loc: ["body", "locale"], msg: "not allowed" }];
    const { client } = setup(
      json(422, { error: { code: "validation_error", message: "Invalid", details } }),
    );
    const result = await runEndpoint(
      endpointById("PATCH /v1/settings"),
      { ...empty, body: '{"locale":"xx"}' },
      client,
    );

    expect(result).toMatchObject({ sent: true, ok: false, status: 422 });
    if (!result.sent) throw new Error("not sent");
    expect(result.error).toMatchObject({ code: "validation_error", message: "Invalid", details });
    expect(result.body).toEqual({
      error: { code: "validation_error", message: "Invalid", details },
    });
  });

  it("a 429 carries the seconds to wait", async () => {
    const { client } = setup(
      json(
        429,
        { error: { code: "rate_limited", message: "Slow", details: { retry_after_seconds: 9 } } },
        { "retry-after": "9" },
      ),
    );
    const result = await runEndpoint(endpointById("GET /v1/me"), empty, client);
    expect(result.sent && result.error?.retryAfterSeconds).toBe(9);
    expect(result.sent && result.error?.action).toBe("wait");
  });

  it("a request that gets no answer does not throw: it is a network_error", async () => {
    const { client } = setup(new TypeError("fetch failed"));
    const result = await runEndpoint(endpointById("GET /v1/health/live"), empty, client);
    expect(result).toMatchObject({
      sent: true,
      ok: false,
      status: 0,
      error: { code: "network_error" },
    });
  });
});

describe("the call log", () => {
  it("has the method, the route, the status, the time and the error code, and nothing else", async () => {
    const { client } = setup(
      json(404, { error: { code: "job_not_found", message: "No such job", details: null } }),
    );
    const get = endpointById("GET /v1/jobs/{job_id}");
    const result = await runEndpoint(
      get,
      { ...empty, path: { job_id: "secret-job-id-123" } },
      client,
      clock(),
    );
    if (!result.sent) throw new Error("not sent");

    const line = toLogLine(get, result, 5);

    expect(line).toEqual({
      at: 5,
      method: "GET",
      path: "/v1/jobs/{job_id}",
      status: 404,
      ms: 42,
      code: "job_not_found",
    });
    // The route template, never the real id; and no body.
    const text = JSON.stringify(line);
    expect(text).not.toContain("secret-job-id-123");
    expect(text).not.toContain("No such job");
  });

  it("never contains an email or a token, even when the answer has them", async () => {
    const { client } = setup(
      json(200, { id: "u1", email: "private@person.example", token: "tok-abc" }),
    );
    const me = endpointById("GET /v1/me");
    const result = await runEndpoint(me, empty, client);
    if (!result.sent) throw new Error("not sent");
    const text = JSON.stringify(toLogLine(me, result, 1));
    expect(text).not.toContain("private@person.example");
    expect(text).not.toContain("tok-abc");
    expect(Object.keys(toLogLine(me, result, 1)).sort()).toEqual([
      "at",
      "code",
      "method",
      "ms",
      "path",
      "status",
    ]);
  });

  it("a query value (a cursor, say) is not in the log either", async () => {
    const { client } = setup(json(200, { items: [], next_cursor: null }));
    const feed = endpointById("GET /v1/feed");
    const result = await runEndpoint(
      feed,
      { ...empty, query: { cursor: "cursor-value-xyz" } },
      client,
    );
    if (!result.sent) throw new Error("not sent");
    expect(JSON.stringify(toLogLine(feed, result, 1))).not.toContain("cursor-value-xyz");
  });
});

describe("jobIdsFrom", () => {
  it("collects the ids of a feed answer, and ignores anything else", () => {
    expect(
      jobIdsFrom({
        items: [{ id: "a" }, { id: "b", title: "x" }, { nope: 1 }, null],
        next_cursor: null,
      }),
    ).toEqual(["a", "b"]);
    expect(jobIdsFrom(null)).toEqual([]);
    expect(jobIdsFrom({ items: "no" })).toEqual([]);
    expect(jobIdsFrom({ id: "me" })).toEqual([]);
  });
});
