import type { ApiClient } from "@/lib/api/client";
import { ApiError, networkError, toApiError } from "@/lib/api/errors";
import type { Endpoint } from "./endpoints";

/**
 * Runs one endpoint of the dev console and reports what happened: the status, how long it
 * took, the body as returned, or the error. It never throws.
 */

export type RunInputs = {
  path: Record<string, string>;
  query: Record<string, string>;
  /** The body as JSON text. */
  body: string;
};

export type RunResult =
  | { sent: false; error: ApiError }
  | {
      sent: true;
      ok: boolean;
      status: number;
      ms: number;
      /** The body as returned (the error body for a failure). */
      body: unknown;
      error: ApiError | null;
    };

/**
 * A line of the call log. Method, route, status and time only: never a token, an email, a
 * body, an id or a query value. `path` is the route as in the contract ("/v1/jobs/{job_id}").
 */
export type LogLine = {
  at: number;
  method: string;
  path: string;
  status: number;
  ms: number;
  /** The error code, for a failure. */
  code: string | null;
};

type LooseRequest = (
  method: string,
  path: string,
  init: unknown,
) => Promise<{ data?: unknown; error?: unknown; response: Response }>;

function refuse(code: string, message: string): RunResult {
  return { sent: false, error: new ApiError({ status: 0, code, message }) };
}

/** Query values: empty ones are left out, numbers are sent as numbers. */
export function buildQuery(def: Endpoint, values: Record<string, string>) {
  const query: Record<string, string | number> = {};
  for (const field of def.query ?? []) {
    const raw = (values[field.name] ?? "").trim();
    if (raw === "") continue;
    query[field.name] = field.kind === "number" ? Number(raw) : raw;
  }
  return query;
}

export async function runEndpoint(
  def: Endpoint,
  inputs: RunInputs,
  client: ApiClient,
  clock: () => number = () => performance.now(),
): Promise<RunResult> {
  const path: Record<string, string> = {};
  for (const param of def.pathParams ?? []) {
    const value = (inputs.path[param.name] ?? "").trim();
    if (!value) return refuse("missing_input", `Fill in ${param.name} first.`);
    path[param.name] = value;
  }

  const query = buildQuery(def, inputs.query);
  for (const field of def.query ?? []) {
    if (field.kind === "number" && field.name in query && !Number.isFinite(query[field.name])) {
      return refuse("invalid_input", `${field.name} must be a number.`);
    }
  }

  let body: unknown;
  if (def.body !== undefined) {
    try {
      body = JSON.parse(inputs.body);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "not JSON";
      return refuse("invalid_json", `The body is not valid JSON: ${detail}`);
    }
  }

  const init: Record<string, unknown> = { params: { path, query } };
  if (def.body !== undefined) init.body = body;

  const started = clock();
  try {
    const request = client.request as unknown as LooseRequest;
    const result = await request(def.method, def.path, init);
    const ms = Math.round(clock() - started);
    const { response } = result;
    if (response.ok) {
      return {
        sent: true,
        ok: true,
        status: response.status,
        ms,
        body: result.data ?? null,
        error: null,
      };
    }
    return {
      sent: true,
      ok: false,
      status: response.status,
      ms,
      body: result.error ?? null,
      error: toApiError(response, result.error),
    };
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : networkError(cause);
    return {
      sent: true,
      ok: false,
      status: 0,
      ms: Math.round(clock() - started),
      body: null,
      error,
    };
  }
}

/** The log line for a call that was sent. Nothing personal goes in it. */
export function toLogLine(
  def: Endpoint,
  result: Extract<RunResult, { sent: true }>,
  at: number,
): LogLine {
  return {
    at,
    method: def.method,
    path: def.path,
    status: result.status,
    ms: result.ms,
    code: result.error?.code ?? null,
  };
}

/** Job ids in a feed response, so the job endpoints can offer them. They are not personal. */
export function jobIdsFrom(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !("items" in body)) return [];
  const items = (body as { items: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) =>
      typeof item === "object" && item !== null ? (item as { id?: unknown }).id : null,
    )
    .filter((id): id is string => typeof id === "string");
}

export const LOG_LIMIT = 50;
