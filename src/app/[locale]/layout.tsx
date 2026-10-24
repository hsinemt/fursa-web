import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fontVariables } from "@/app/fonts";
import { getDirection, routing } from "@/i18n/routing";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "@/styles/globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // The saved appearance choice is read here so the server renders the right mode: no flash.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const t = await getTranslations({ locale, namespace: "a11y" });

  return (
    <html lang={locale} dir={getDirection(locale)} data-theme={theme} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only rounded-control bg-panel px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
          >
            {t("skipToContent")}
          </a>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
