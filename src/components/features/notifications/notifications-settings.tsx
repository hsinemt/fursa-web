"use client";

import { useTranslations } from "next-intl";
import { LoadError } from "@/components/features/feed/load-error";
import { SettingsCard } from "@/components/features/settings/settings-card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/lib/profile/hooks";
import { AlertsSection } from "./alerts-section";
import { TelegramSection } from "./telegram-section";

/** The Alerts and Telegram cards of the settings page. */
export function NotificationsSettings() {
  const t = useTranslations("settings");
  const query = usePreferences();

  if (query.isPending) {
    return (
      <>
        <SettingsCard id="alerts" title={t("alerts.title")} help={t("alerts.help")}>
          <div aria-busy="true">
            <Skeleton className="h-24" />
          </div>
        </SettingsCard>
        <SettingsCard id="telegram" title={t("telegram.title")} help={t("telegram.help")}>
          <Skeleton className="h-16" />
        </SettingsCard>
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <SettingsCard id="alerts" title={t("alerts.title")} help={t("alerts.help")}>
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        </SettingsCard>
        <SettingsCard id="telegram" title={t("telegram.title")} help={t("telegram.help")}>
          <p className="text-slate">{t("telegram.needsAlerts")}</p>
        </SettingsCard>
      </>
    );
  }
  return (
    <>
      <SettingsCard id="alerts" title={t("alerts.title")} help={t("alerts.help")}>
        <AlertsSection prefs={query.data} />
      </SettingsCard>
      <SettingsCard id="telegram" title={t("telegram.title")} help={t("telegram.help")}>
        <TelegramSection prefs={query.data} />
      </SettingsCard>
    </>
  );
}
