import { refreshSession } from "@/lib/auth/actions";
import { createApiClient } from "./client";

/**
 * The API client for code that runs in the browser. When the API answers `token_expired`,
 * it asks the server to refresh the session (a Server Action that updates both cookies) and
 * sends the request once more. Use it as `await call(api.GET("/v1/me"))`.
 */
export const api = createApiClient({ onTokenExpired: refreshSession });
