import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { SignupForm } from "@/components/features/auth/signup-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return { title: t("title") };
}

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");

  return (
    <AuthShell
      title={t("title")}
      intro={t("intro")}
      footer={
        <p>
          {t("haveAccount")}{" "}
          <Link href="/login" className="inline-link text-accent hover:underline">
            {t("signInLink")}
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
