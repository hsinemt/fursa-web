import createIntlProxy from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { authenticate } from "@/lib/auth/proxy";
import { decideAccess, stripLocale } from "@/lib/auth/paths";
import { buildCsp } from "@/lib/security/csp";

// Next.js 16 calls this file "proxy" (it was "middleware" before). For every page request it:
// 1. adds a Content-Security-Policy with a nonce,
// 2. handles the locale prefix (next-intl),
// 3. refreshes the session and keeps both session cookies in step (src/lib/auth),
// 4. sends visitors without a session away from the app pages, and signed-in visitors away
//    from the welcome and sign-in pages.
const intlProxy = createIntlProxy(routing);

export default async function proxy(request: NextRequest) {
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

  // A redirect to add the language prefix: nothing else to do yet.
  if (response.headers.has("location")) return response;

  const { locale, path } = stripLocale(request.nextUrl.pathname);
  // The email-link callback does its own session work.
  if (!locale || path.startsWith("/auth/")) return response;

  const state = await authenticate(request, response);
  const decision = decideAccess({ path, search: request.nextUrl.search, signedIn: state.signedIn });
  if (decision.type === "next") return response;

  const target = request.nextUrl.clone();
  target.pathname = `/${locale}${decision.to}`;
  target.search = decision.next ? `?next=${encodeURIComponent(decision.next)}` : "";
  const redirect = NextResponse.redirect(target);

  // The redirect keeps what the session refresh wrote: cookies and no-cache headers.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  response.headers.forEach((value, key) => {
    if (
      key === "content-security-policy" ||
      key === "cache-control" ||
      key === "pragma" ||
      key === "expires"
    ) {
      redirect.headers.set(key, value);
    }
  });
  return redirect;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
