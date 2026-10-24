import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { locales, routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return {
    title: t("title"),
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}/privacy`])),
    },
  };
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
