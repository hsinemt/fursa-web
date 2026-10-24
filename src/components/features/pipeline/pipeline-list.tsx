"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LoadError } from "@/components/features/feed/load-error";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/ui/company-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useFeed } from "@/lib/feed/hooks";
import { flattenPages, formatDate, type JobSummary, type UserJobStatus } from "@/lib/feed/values";
import { matchesSearch } from "@/lib/pipeline/values";
import { cn } from "@/lib/utils/cn";
import { COLUMNS, MoveMenu, type Column } from "./pipeline-card";

type FeedQuery = ReturnType<typeof useFeed>;

/**
 * Where a job is on its way: Saved, Applied, Interview, Rejected, as a line with four stops.
 * The current stop is filled and has the date the status last changed under it; the stops
 * already passed carry a check; the others are hollow. Every other stop is a button that moves
 * the job there, so the stepper is a direct way to change the status.
 */
export function StatusStepper({
  job,
  status,
  onMove,
}: {
  job: JobSummary;
  status: Column;
  onMove: (to: UserJobStatus) => void;
}) {
  const t = useTranslations("pipeline.stepper");
  const statusT = useTranslations("status");
  const locale = useLocale();
  const current = COLUMNS.indexOf(status);
  const rejected = status === "rejected";

  return (
    <ol aria-label={t("label", { title: job.title })} className="flex items-start">
      {COLUMNS.map((stage, index) => {
        const isCurrent = index === current;
        const passed = !rejected && index < current;
        // The line before a stop is lit when the job has come that far.
        const lit = !rejected && index <= current;
        const stopColor = rejected ? "bg-status-rejected" : "bg-accent";
        return (
          <li
            key={stage}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span className={cn("text-xs", isCurrent ? "font-medium text-ink" : "text-slate")}>
              {statusT(stage)}
            </span>
            <span className="relative flex h-5 w-full items-center justify-center">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute start-0 h-0.5 w-1/2 transition-colors duration-200",
                    lit ? "bg-accent" : "bg-line",
                  )}
                />
              ) : null}
              {index < COLUMNS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute end-0 h-0.5 w-1/2 transition-colors duration-200",
                    !rejected && index < current ? "bg-accent" : "bg-line",
                  )}
                />
              ) : null}
              {isCurrent ? (
                <span
                  aria-hidden="true"
                  className={cn("relative z-10 size-5 rounded-full", stopColor)}
                />
              ) : (
                <button
                  type="button"
                  aria-label={t("moveTo", { status: statusT(stage) })}
                  onClick={() => onMove(stage)}
                  className={cn(
                    "relative z-10 inline-flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-150",
                    passed
                      ? "border-accent bg-tint text-accent"
                      : "border-control bg-page hover:border-accent",
                  )}
                >
                  {passed ? <Check width={12} height={12} strokeWidth={3} aria-hidden /> : null}
                </button>
              )}
            </span>
            <span className="tabular h-4 text-xs text-slate">
              {isCurrent ? formatDate(job.updated_at, locale) : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type Row = { job: JobSummary; status: Column };

/** The List view: one row per job (all four statuses together), with the stepper. */
export function PipelineList({
  queries,
  search,
  onMove,
}: {
  queries: Record<Column, FeedQuery>;
  search: string;
  onMove: (job: JobSummary, from: Column, to: UserJobStatus) => void;
}) {
  const t = useTranslations("pipeline");

  const pending = COLUMNS.some((column) => queries[column].isPending);
  const failed = COLUMNS.find((column) => queries[column].isError && !queries[column].data);
  const loaded: Row[] = COLUMNS.flatMap((status) =>
    flattenPages(queries[status].data).map((job) => ({ job, status })),
  );
  const rows = loaded.filter(({ job }) => matchesSearch(job, search));
  const more = COLUMNS.filter((column) => queries[column].hasNextPage);

  if (pending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-24 rounded-panel" />
        <Skeleton className="h-24 rounded-panel" />
      </div>
    );
  }
  if (failed) {
    return (
      <LoadError error={queries[failed].error} onRetry={() => void queries[failed].refetch()} />
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center rounded-panel border border-dashed border-line px-4 py-6 text-center">
        {loaded.length > 0 ? (
          <p className="text-sm text-slate">{t("noMatchList")}</p>
        ) : (
          <>
            <p className="font-medium text-ink">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-slate">{t("empty.text")}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <ul aria-label={t("view.list")} className="flex flex-col gap-2">
        {rows.map(({ job, status }) => (
          <li
            key={job.job_id}
            data-slot="list-row"
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-panel border border-line bg-panel p-3 transition-colors duration-150 ease-out hover:border-control motion-safe:animate-[card-in_200ms_ease-out_both]"
          >
            <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
              <CompanyLogo name={job.company} />
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.job_id}`}
                  dir="auto"
                  className="block truncate font-medium text-ink hover:underline"
                >
                  {job.title}
                </Link>
                <p dir="auto" className="truncate text-sm text-slate">
                  {[job.company, job.location ?? job.country].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="order-last w-full lg:order-none lg:w-96">
              <StatusStepper job={job} status={status} onMove={(to) => onMove(job, status, to)} />
            </div>
            <MoveMenu
              job={job}
              from={status}
              onMove={(to) => onMove(job, status, to)}
              variant="status"
            />
          </li>
        ))}
      </ul>
      {more.length > 0 ? (
        <div className="mt-3">
          <Button
            disabled={more.some((column) => queries[column].isFetchingNextPage)}
            onClick={() => more.forEach((column) => void queries[column].fetchNextPage())}
          >
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
