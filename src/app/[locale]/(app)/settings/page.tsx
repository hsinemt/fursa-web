import { useTranslations } from "next-intl";
import { cookies } from "next/headers";
import { use } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ThemeList } from "@/components/layout/theme-switcher";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default function SettingsPage() {
  const t = useTranslations("pages.settings");
  const language = useTranslations("language");
  const theme = useTranslations("theme");
  const current = parseTheme(use(cookies()).get(THEME_COOKIE)?.value);

  return (
    <PlaceholderPage title={t("title")} description={t("placeholder")}>
      {/* On phones, language and appearance live here (the top bar is hidden). */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{language("label")}</h2>
        <p className="mt-1 mb-4 text-slate">{language("help")}</p>
        <LanguageSwitcher variant="list" />
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{theme("label")}</h2>
        <p className="mt-1 mb-4 text-slate">{theme("help")}</p>
        <ThemeList current={current} />
      </section>
    </PlaceholderPage>
  );
}
