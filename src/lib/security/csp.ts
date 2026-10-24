/**
 * Content-Security-Policy, built per request so scripts can carry a nonce
 * (no inline script without one). Used by src/proxy.ts. The other security
 * headers are static and live in next.config.ts.
 */

const DEFAULT_API_URL = "http://localhost:8000";

/** Origin of the API (scheme + host + port), or the local default if unset or invalid. */
export function apiOrigin(raw: string | undefined): string {
  try {
    return new URL(raw && raw.length > 0 ? raw : DEFAULT_API_URL).origin;
  } catch {
    return new URL(DEFAULT_API_URL).origin;
  }
}

export function buildCsp(opts: { nonce: string; apiUrl?: string; isDev: boolean }): string {
  const { nonce, isDev } = opts;
  const api = apiOrigin(opts.apiUrl);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets nonce-trusted scripts load their chunks.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes are used by Radix and next/font; scripts stay strict.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      api,
      ...(isDev ? ["ws://localhost:3000", "ws://127.0.0.1:3000"] : []),
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };

  return Object.entries(directives)
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}
