import createIntlProxy from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { buildCsp } from "@/lib/security/csp";

// Next.js 16 calls this file "proxy" (it was "middleware" before).
// It handles the locale prefix and adds a Content-Security-Policy with a nonce.
const intlProxy = createIntlProxy(routing);

export default function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    isDev: process.env.NODE_ENV !== "production",
    https: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
  });

  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  const response = intlProxy(request);
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
