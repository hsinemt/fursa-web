"use client";

import { useTranslations } from "next-intl";
import { LoadError } from "@/components/features/feed/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/lib/profile/hooks";
import { AlertsSection } from "./alerts-section";
import { TelegramSection } from "./telegram-section";

const Group = ({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: React.ReactNode;
}) => (
  <section className="mt-8 border-t border-line pt-6">
    <h2 className="text-md">{title}</h2>
    <p className="mt-1 mb-4 text-slate">{help}</p>
    {children}
  </section>
);

/** The Alerts and Telegram groups of the settings page. */
export function NotificationsSettings() {
  const t = useTranslations("settings");
  const query = usePreferences();

  if (query.isPending) {
    return (
      <div className="mt-8 flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <Group title={t("alerts.title")} help={t("alerts.help")}>
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      </Group>
    );
  }
  return (
    <>
      <Group title={t("alerts.title")} help={t("alerts.help")}>
        <AlertsSection prefs={query.data} />
      </Group>
      <Group title={t("telegram.title")} help={t("telegram.help")}>
        <TelegramSection prefs={query.data} />
      </Group>
    </>
  );
}
