import { useTranslations } from "next-intl";
import { cookies } from "next/headers";
import { use } from "react";
import { DataSection } from "@/components/features/account/data-section";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { NotificationsSettings } from "@/components/features/notifications/notifications-settings";
import { SettingsCard, type SettingsSection } from "@/components/features/settings/settings-card";
import { SettingsRail } from "@/components/features/settings/settings-rail";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeList } from "@/components/layout/theme-switcher";
import { getCurrentUser } from "@/lib/auth/server";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("pages.settings");

export default function SettingsPage() {
  const t = useTranslations("pages.settings");
  const settings = useTranslations("settings");
  const language = useTranslations("language");
  const theme = useTranslations("theme");
  const auth = useTranslations("auth");
  const data = useTranslations("settings.data");
  const current = parseTheme(use(cookies()).get(THEME_COOKIE)?.value);
  const user = use(getCurrentUser());

  const sections: { id: SettingsSection; label: string }[] = [
    { id: "language", label: language("label") },
    { id: "appearance", label: theme("label") },
    { id: "alerts", label: settings("alerts.title") },
    { id: "telegram", label: settings("telegram.title") },
    { id: "data", label: data("title") },
    { id: "account", label: auth("account.title") },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("placeholder")}</p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsRail label={settings("sections")} items={sections} />
        <div className="flex max-w-3xl min-w-0 flex-col gap-4">
          {/* On phones, language, appearance and sign out live here (the top bar is hidden). */}
          <SettingsCard id="language" title={language("label")} help={language("help")}>
            <LanguageSwitcher variant="list" syncAccount />
          </SettingsCard>
          <SettingsCard id="appearance" title={theme("label")} help={theme("help")}>
            <ThemeList current={current} />
          </SettingsCard>
          <NotificationsSettings />
          <SettingsCard id="data" title={data("title")} help={data("help")}>
            <DataSection />
          </SettingsCard>
          <SettingsCard id="account" title={auth("account.title")} help={auth("account.help")}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              {user?.email ? (
                <p dir="ltr" className="min-w-0 truncate text-start text-md text-ink">
                  {user.email}
                </p>
              ) : null}
              <SignOutButton variant="secondary" />
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
