import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { ForgotForm } from "@/components/features/auth/forgot-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgot");

  return (
    <AuthShell
      title={t("title")}
      intro={t("intro")}
      footer={
        <Link href="/login" className="inline-link text-accent hover:underline">
          {t("back")}
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
