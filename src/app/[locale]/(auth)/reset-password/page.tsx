import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { ResetForm } from "@/components/features/auth/reset-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title") };
}

/**
 * Where the link of a reset email lands once the callback route has signed the person in
 * for this one purpose. Without that session (the page was opened directly, or the link
 * expired) there is nothing to reset: back to asking for a link.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user && hasLocale(routing.locales, locale)) {
    redirect({ href: { pathname: "/forgot-password" }, locale });
  }

  const t = await getTranslations("auth.reset");
  return (
    <AuthShell title={t("title")} intro={t("intro")}>
      <ResetForm />
    </AuthShell>
  );
}
