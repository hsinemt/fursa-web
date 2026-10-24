import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.checkEmail");
  return { title: t("title") };
}

/** Shown after signing up when the email must be confirmed first. */
export default async function CheckEmailPage() {
  const t = await getTranslations("auth.checkEmail");

  return (
    <AuthShell
      title={t("title")}
      footer={
        <Link href="/login" className="inline-link text-accent hover:underline">
          {t("back")}
        </Link>
      }
    >
      <p className="text-ink">{t("text")}</p>
      <p className="mt-3 text-slate">{t("spam")}</p>
    </AuthShell>
  );
}
