import { NextResponse, type NextRequest } from "next/server";
import { locales } from "@/i18n/routing";
import { HOME_FOR_SIGNED_IN, safeNext } from "@/lib/auth/paths";
import { mirrorAccessToken } from "@/lib/auth/session";
import { createAuthClient } from "@/lib/auth/server";
import { siteUrl } from "@/lib/site";

/** A redirect that no CDN or proxy may cache: it can carry a session. */
function redirectTo(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Where the links of confirmation and reset emails land (/[locale]/auth/callback?code=...).
 * The code is exchanged for a session on the server, both cookies are written, and the
 * person goes on to `next`: the feed after a confirmation, the new-password page after a
 * reset. A bad or expired link goes back to the login page with a message.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale = locales.find((code) => code === raw) ?? "en";
  const origin = siteUrl().origin;
  const failed = new URL(`/${locale}/login?notice=link_invalid`, origin);

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectTo(failed);

  const client = await createAuthClient();
  if (!client) return redirectTo(failed);

  const { error } = await client.supabase.auth.exchangeCodeForSession(code);
  if (error) return redirectTo(failed);

  await mirrorAccessToken(client.supabase, client.jar, client.ctx);
  const next = safeNext(request.nextUrl.searchParams.get("next")) ?? HOME_FOR_SIGNED_IN;
  return redirectTo(new URL(`/${locale}${next}`, origin));
}
