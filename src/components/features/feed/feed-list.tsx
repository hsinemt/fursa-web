"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { JobRow } from "@/components/features/job-row";
import { FeedNudge } from "@/components/features/profile/feed-nudge";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/ui/company-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { feedKeys, useFeed } from "@/lib/feed/hooks";
import {
  filterCount,
  parseParams,
  paramsQuery,
  withoutFilters,
  type FeedParams,
} from "@/lib/feed/params";
import {
  flattenPages,
  parseSort,
  type Sort,
  STATUSES,
  timeAgo,
  type JobSummary,
  type UserJobStatus,
} from "@/lib/feed/values";
import { useProfile } from "@/lib/profile/hooks";
import { scoreBand } from "@/lib/utils/score";
import { cn } from "@/lib/utils/cn";
import { FiltersPopover, SearchBox } from "./feed-filters";
import { LoadError } from "./load-error";

/** The id of the open job, read from `/jobs/<id>`. */
export function jobIdFromPath(pathname: string): string | null {
  const match = /^\/jobs\/([^/?#]+)/.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** The address of a job, keeping the status, the order and the filters of the list. */
export function jobHref(id: string, params: FeedParams): string {
  return `/jobs/${id}${paramsQuery(params)}`;
}

/** The quiet lines of a row: the company, then "place · 3 days ago · Closed". */
function metaLines(job: JobSummary, now: Date, locale: string, closed: string): string[] {
  const second = [
    job.location ?? job.country,
    timeAgo(job.posted_at, now, locale),
    job.is_active ? null : closed,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  return [job.company, second].filter(Boolean);
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="size-10 shrink-0 rounded-panel" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

/** The status filter: All, New, Saved, Applied, Interview, Rejected. */
function StatusFilter({
  value,
  onChange,
}: {
  value: UserJobStatus | null;
  onChange: (v: UserJobStatus | null) => void;
}) {
  const t = useTranslations("feed");
  const statusT = useTranslations("status");
  const options: { key: UserJobStatus | null; label: string }[] = [
    { key: null, label: t("filterAll") },
    ...STATUSES.map((s) => ({ key: s, label: statusT(s) })),
  ];
  return (
    <div
      role="group"
      aria-label={t("filterLabel")}
      className="-mx-1 mt-3 flex gap-0.5 overflow-x-auto px-1 pb-1"
    >
      {options.map(({ key, label }) => (
        <button
          key={key ?? "all"}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-control px-2.5 text-sm whitespace-nowrap pointer-coarse:h-11",
            value === key
              ? "bg-tint font-medium text-accent"
              : "text-slate hover:bg-tint hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Best match (the API order) or newest posting first. */
function SortSelect({ value, onChange }: { value: Sort; onChange: (sort: Sort) => void }) {
  const t = useTranslations("feed");
  return (
    <select
      aria-label={t("sortLabel")}
      value={value}
      onChange={(event) => onChange(parseSort(event.target.value))}
      className="h-9 rounded-control border border-control bg-panel px-2 text-sm text-ink pointer-coarse:h-11"
    >
      <option value="best">{t("sort.best")}</option>
      <option value="newest">{t("sort.newest")}</option>
    </select>
  );
}

/** The list side of the feed: header, status filter, rows, "Load more". */
export function FeedList({ onJob }: { onJob: boolean }) {
  const t = useTranslations("feed");
  const statusT = useTranslations("status");
  const scoreT = useTranslations("score");
  const errors = useTranslations("errors");
  const locale = useLocale();
  const toast = useToast();
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const profile = useProfile();

  const params = parseParams(search);
  const { status: filter, sort } = params;
  const filters = filterCount(params);
  const selectedId = jobIdFromPath(pathname);
  // The API sorts and filters; the page only passes the choices on.
  const query = useFeed(filter, { sort, filters: params });
  const items = flattenPages(query.data);
  const error = query.error;

  // A cursor the API no longer accepts: start the list again from the first page.
  useEffect(() => {
    if (error instanceof ApiError && error.code === "invalid_cursor") {
      toast.show(errors("invalid_cursor"));
      void client.resetQueries({ queryKey: feedKeys.list(filter, { sort, filters: params }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params is rebuilt every render; its parts are in the key below
  }, [error, client, toast, errors, filter, sort, paramsQuery(params)]);

  const go = (next: FeedParams) => router.replace(`${pathname}${paramsQuery(next)}`);
  const changeFilter = (next: UserJobStatus | null) => go({ ...params, status: next });
  const changeSort = (next: Sort) => go({ ...params, sort: next });

  const Heading = onJob ? "h2" : "h1";
  const now = new Date();
  const noRoles = profile.data ? profile.data.target_roles.length === 0 : false;
  const cursorProblem = error instanceof ApiError && error.code === "invalid_cursor";

  return (
    <section aria-labelledby="feed-title">
      <div className="sticky top-0 z-10 border-b border-line bg-page px-4 pt-4 pb-3 lg:rounded-t-panel">
        <div className="flex items-center justify-between gap-3">
          <Heading id="feed-title" className="text-xl">
            {t("title")}
          </Heading>
          <SortSelect value={sort} onChange={changeSort} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <SearchBox value={params.q} onCommit={(q) => go({ ...params, q })} />
          <FiltersPopover params={params} onChange={go} />
        </div>
        <StatusFilter value={filter} onChange={changeFilter} />
      </div>

      <div>
        {query.isPending ? (
          <div aria-busy="true">
            <SkeletonRows count={6} />
          </div>
        ) : error && !query.data ? (
          cursorProblem ? (
            <SkeletonRows count={6} />
          ) : (
            <LoadError className="m-4" error={error} onRetry={() => void query.refetch()} />
          )
        ) : items.length === 0 ? (
          filters > 0 ? (
            <div className="px-4">
              <EmptyState
                title={t("filters.noMatch.title")}
                description={t("filters.noMatch.text")}
                action={
                  <Button onClick={() => go(withoutFilters(params))}>{t("filters.clear")}</Button>
                }
              />
            </div>
          ) : filter ? (
            <EmptyState
              className="px-4"
              title={t("emptyFilter.title")}
              description={t("emptyFilter.text")}
            />
          ) : noRoles ? (
            <div className="px-4">
              <FeedNudge />
            </div>
          ) : (
            <EmptyState className="px-4" title={t("empty.title")} description={t("empty.text")} />
          )
        ) : (
          <>
            {error && !cursorProblem && !query.isFetchNextPageError ? (
              <LoadError className="m-4" error={error} onRetry={() => void query.refetch()} />
            ) : null}
            <ul aria-label={t("jobList")} className="divide-y divide-line">
              {items.map((job) => (
                <JobRow
                  key={job.job_id}
                  link={(content, className) => (
                    <Link
                      href={jobHref(job.job_id, params)}
                      aria-current={job.job_id === selectedId ? "true" : undefined}
                      className={className}
                    >
                      {content}
                    </Link>
                  )}
                  selected={job.job_id === selectedId}
                  title={job.title}
                  leading={<CompanyLogo name={job.company} src={job.company_logo_url} />}
                  meta={metaLines(job, now, locale, t("closed"))}
                  reason={job.explanation ?? undefined}
                  ring
                  score={job.score}
                  scoreLabel={scoreT(scoreBand(job.score))}
                  aside={
                    job.status === "new" ? undefined : (
                      <Status status={job.status} className="text-xs text-slate">
                        {statusT(job.status)}
                      </Status>
                    )
                  }
                />
              ))}
            </ul>
            {query.isFetchingNextPage ? (
              <div aria-busy="true">
                <span role="status" className="sr-only">
                  {t("loadingMore")}
                </span>
                <SkeletonRows count={2} />
              </div>
            ) : null}
            {query.isFetchNextPageError ? (
              <LoadError className="m-4" error={error} onRetry={() => void query.fetchNextPage()} />
            ) : query.hasNextPage && !query.isFetchingNextPage ? (
              <div className="border-t border-line p-4">
                <Button onClick={() => void query.fetchNextPage()}>{t("loadMore")}</Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
