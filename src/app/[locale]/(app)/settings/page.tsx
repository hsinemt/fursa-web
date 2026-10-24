import { useTranslations } from "next-intl";
import { cookies } from "next/headers";
import { use } from "react";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { DataSection } from "@/components/features/account/data-section";
import { NotificationsSettings } from "@/components/features/notifications/notifications-settings";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { ThemeList } from "@/components/layout/theme-switcher";
import { getCurrentUser } from "@/lib/auth/server";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default function SettingsPage() {
  const t = useTranslations("pages.settings");
  const language = useTranslations("language");
  const theme = useTranslations("theme");
  const auth = useTranslations("auth");
  const data = useTranslations("settings.data");
  const current = parseTheme(use(cookies()).get(THEME_COOKIE)?.value);
  const user = use(getCurrentUser());

  return (
    <PlaceholderPage title={t("title")} description={t("placeholder")}>
      {/* On phones, language, appearance and sign out live here (the top bar is hidden). */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{language("label")}</h2>
        <p className="mt-1 mb-4 text-slate">{language("help")}</p>
        <LanguageSwitcher variant="list" syncAccount />
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{theme("label")}</h2>
        <p className="mt-1 mb-4 text-slate">{theme("help")}</p>
        <ThemeList current={current} />
      </section>
      <NotificationsSettings />
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{data("title")}</h2>
        <p className="mt-1 mb-4 text-slate">{data("help")}</p>
        <DataSection />
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-md">{auth("account.title")}</h2>
        <p className="mt-1 text-slate">{auth("account.help")}</p>
        {user?.email ? (
          <p dir="ltr" className="mt-3 text-start text-ink">
            {user.email}
          </p>
        ) : null}
        <div className="mt-4">
          <SignOutButton variant="secondary" />
        </div>
      </section>
    </PlaceholderPage>
  );
}
