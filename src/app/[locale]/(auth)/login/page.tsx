import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/features/auth/auth-shell";
import { LoginForm } from "@/components/features/auth/login-form";
import { Link } from "@/i18n/navigation";
import { safeNext } from "@/lib/auth/paths";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, notice } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("login.title")}
      intro={t("login.intro")}
      notice={
        notice === "link_invalid"
          ? { kind: "error", text: t("notices.link_invalid") }
          : notice === "signed_out"
            ? { kind: "info", text: t("notices.signed_out") }
            : notice === "account_deleted"
              ? { kind: "info", text: t("notices.account_deleted") }
              : undefined
      }
      footer={
        <p>
          {t("login.noAccount")}{" "}
          <Link href="/signup" className="inline-link text-accent hover:underline">
            {t("login.createOne")}
          </Link>
        </p>
      }
    >
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  );
}
