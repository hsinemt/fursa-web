"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { FeedList } from "./feed-list";

/**
 * The feed layout, shared by `/feed` and `/jobs/<id>` so the list stays loaded while a job is
 * open. Laptop: the list and the open job side by side. Phone and tablet: only one of them,
 * the list on `/feed` and the job on `/jobs/<id>`.
 */
export function FeedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onJob = pathname.startsWith("/jobs/");

  return (
    <div className="lg:grid lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className={cn(onJob ? "hidden lg:block" : "block")}>
        <FeedList onJob={onJob} />
      </div>
      <div className={cn(onJob ? "block" : "hidden lg:block")}>{children}</div>
    </div>
  );
}

/** What the open-job side says on laptop while no job is chosen. */
export function PickAJob() {
  const t = useTranslations("feed");
  return <p className="py-8 text-slate">{t("pickOne")}</p>;
}
