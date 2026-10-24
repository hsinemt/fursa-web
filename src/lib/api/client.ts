import createClient from "openapi-fetch";
import { apiOrigin } from "@/lib/security/csp";
import { ApiError, networkError, toApiError } from "./errors";
import type { paths } from "./schema";

export type ApiClientOptions = {
  /** Where the API runs. Defaults to NEXT_PUBLIC_API_URL, then http://localhost:8000. */
  baseUrl?: string;
  /** For tests, or to run on the server with another fetch. */
  fetch?: typeof fetch;
  /**
   * Called once when the API answers 401 `token_expired`. Refresh the session (a server
   * call that updates both cookies) and return true to have the request sent again.
   * Without it, the error is passed on and the UI goes to login.
   */
  onTokenExpired?: () => Promise<boolean>;
};

/**
 * The API client. Every call goes through the generated types (`paths` comes from the
 * contract), so a wrong path, parameter or body is a type error. It sends cookies with
 * every call (`credentials: "include"`): the session lives in HttpOnly cookies and the API
 * reads `fursa_access_token`.
 */
export function createApiClient(options: ApiClientOptions = {}) {
  const baseFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const { onTokenExpired } = options;

  // openapi-fetch hands over a Request. Keep a copy: a sent Request cannot be sent again.
  const apiFetch = async (request: Request): Promise<Response> => {
    const retry = onTokenExpired ? request.clone() : null;
    const response = await baseFetch(request);

    if (response.status === 401 && retry && onTokenExpired) {
      const body: unknown = await response
        .clone()
        .json()
        .catch(() => null);
      const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
      if (code === "token_expired" && (await onTokenExpired())) {
        return baseFetch(retry); // once: this second answer is passed on whatever it is
      }
    }
    return response;
  };

  return createClient<paths>({
    baseUrl: options.baseUrl ?? apiOrigin(process.env.NEXT_PUBLIC_API_URL),
    credentials: "include",
    fetch: async (request) => {
      try {
        return await apiFetch(request);
      } catch (cause) {
        throw networkError(cause);
      }
    },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

type Result<T> = { data?: T; error?: unknown; response: Response };

/**
 * Unwraps a call: returns the data, or throws an `ApiError` (with the code, message,
 * details and, for a 429, the seconds to wait). A call that never reached the API throws
 * an `ApiError` with the code `network_error`.
 *
 *   const me = await call(api.GET("/v1/me"));
 */
export async function call<T>(request: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await request;
  } catch (cause) {
    throw cause instanceof ApiError ? cause : networkError(cause);
  }
  if (!result.response.ok) throw toApiError(result.response, result.error);
  return result.data as T; // undefined for a 204, which has no body
}
