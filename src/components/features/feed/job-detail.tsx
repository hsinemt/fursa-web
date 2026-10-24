"use client";

import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  MapPin,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CompanyLogo } from "@/components/ui/company-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Score } from "@/components/ui/score";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { LoadError } from "./load-error";
import { ScoreBreakdown } from "./score-breakdown";
import { StatusGroup } from "./status-group";
import { ApiError } from "@/lib/api/errors";
import { useJob, useSetStatus } from "@/lib/feed/hooks";
import {
  formatDate,
  formatSalary,
  htmlToText,
  missingSkills,
  paragraphs,
  splitSections,
  feedQuery,
  parseFilter,
  parseSort,
  readBreakdown,
  readFacts,
  safeHttpUrl,
  timeAgo,
  type JobDetail,
  type UserJobStatus,
} from "@/lib/feed/values";
import { cn } from "@/lib/utils/cn";
import { scoreBand } from "@/lib/utils/score";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate">{label}</dt>
      <dd dir="auto" className="mt-0.5 text-base text-ink">
        {children}
      </dd>
    </div>
  );
}

/** A hairline-separated part of the side panel. */
const PanelPart = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
    <h2 className="mb-3 text-sm text-slate">{title}</h2>
    {children}
  </section>
);

function PlainText({ text }: { text: string }) {
  return (
    <div className="max-w-[80ch] space-y-4">
      {paragraphs(text).map((block, i) => (
        <p key={i} dir="auto" className="whitespace-pre-line text-base">
          {block}
        </p>
      ))}
    </div>
  );
}

/**
 * The description in two modes. Summary: the AI summary when the API has one, then the
 * Responsibilities, Qualifications and Benefits found under the posting's own headings.
 * Full posting: the whole text. Both are plain text, never HTML ("Scraped text is untrusted").
 */
function Description({ raw, summary }: { raw: string | null; summary: string | null }) {
  const t = useTranslations("job.description");
  const text = htmlToText(raw);
  const summaryText = summary ? htmlToText(summary) : "";
  const sections = splitSections(text);
  const canSummarize = sections.length > 0 || summaryText.length > 0;
  const [mode, setMode] = useState<"summary" | "full">("summary");
  const showSummary = canSummarize && mode === "summary";

  return (
    <section className="border-t border-line pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-md">{t("title")}</h2>
        {canSummarize && text.length > 0 ? (
          <div
            role="group"
            aria-label={t("modeLabel")}
            className="flex gap-0.5 rounded-control bg-panel p-0.5"
          >
            {(["summary", "full"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
                className={cn(
                  "h-8 rounded-control px-3 text-sm pointer-coarse:h-10",
                  mode === key ? "bg-page font-medium text-ink" : "text-slate hover:text-ink",
                )}
              >
                {t(key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {text.length === 0 && summaryText.length === 0 ? (
        <p className="text-slate">{t("empty")}</p>
      ) : showSummary ? (
        <div className="max-w-[80ch] space-y-6">
          {summaryText ? (
            <div>
              <p dir="auto" className="text-base">
                {summaryText}
              </p>
              <p className="mt-2 text-xs text-slate">{t("byAi")}</p>
            </div>
          ) : null}
          {sections.map(({ kind, items }) => (
            <div key={kind}>
              <h3 className="mb-2 text-md">{t(`sections.${kind}`)}</h3>
              <ul className="list-disc space-y-2 ps-5 text-base marker:text-slate">
                {items.map((item, i) => (
                  <li key={i} dir="auto">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {sections.length > 0 ? <p className="text-xs text-slate">{t("cutFromPosting")}</p> : null}
        </div>
      ) : (
        <PlainText text={text} />
      )}
    </section>
  );
}

function Detail({ job }: { job: JobDetail }) {
  const t = useTranslations("job");
  const scoreT = useTranslations("score");
  const statusT = useTranslations("status");
  const levelT = useTranslations("profile.seniority.options");
  const locale = useLocale();
  const toast = useToast();
  const setStatus = useSetStatus();

  const facts = readFacts(job);
  const breakdown = readBreakdown(job.breakdown);
  const missing = missingSkills(facts.techStack, breakdown.matchedSkills);
  const posting = safeHttpUrl(job.url);
  const place = [job.location, job.country].filter(Boolean).join(", ");
  const salary = facts.salary
    ? `${formatSalary(facts.salary, locale)}${facts.salary.period ? ` ${t(`per.${facts.salary.period}`)}` : ""}`
    : null;
  const modeAndType = [
    facts.workMode ? t(`workMode.${facts.workMode}`) : null,
    facts.employmentType ? t(`employment.${facts.employmentType}`) : null,
  ].filter((part): part is string => Boolean(part));
  const ago = timeAgo(job.posted_at, new Date(), locale);

  function change(status: UserJobStatus) {
    if (status === job.status) return;
    setStatus.mutate(
      { id: job.job_id, status },
      {
        onError: () => toast.show(t("statusFailed")),
        onSuccess: () => toast.show(t("statusChanged", { status: statusT(status) })),
      },
    );
  }

  const keyFacts: { icon: LucideIcon; text: string }[] = [
    place ? { icon: MapPin, text: place } : null,
    modeAndType.length > 0 ? { icon: Briefcase, text: modeAndType.join(" · ") } : null,
    salary ? { icon: Wallet, text: salary } : null,
    facts.level ? { icon: TrendingUp, text: levelT(facts.level) } : null,
  ].filter((fact): fact is { icon: LucideIcon; text: string } => fact !== null);

  const hasSkills = breakdown.matchedSkills.length > 0 || missing.length > 0;

  return (
    <article className="grid gap-x-8 gap-y-6 min-[1180px]:grid-cols-[minmax(0,1fr)_20rem]">
      <header className="min-w-0 min-[1180px]:col-start-1">
        <div className="flex items-start gap-4">
          <CompanyLogo name={job.company} size="lg" />
          <div className="min-w-0">
            <h1 dir="auto" className="text-xl">
              {job.title}
            </h1>
            <p dir="auto" className="mt-1 text-md text-ink">
              {[job.company, ago].filter(Boolean).join(" · ")}
              {job.is_active ? null : <span className="text-slate"> · {t("closed")}</span>}
            </p>
          </div>
        </div>
        {keyFacts.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {keyFacts.map(({ icon: Icon, text }) => (
              <li key={text} dir="auto" className="flex items-center gap-2 text-base text-ink">
                <Icon
                  className="shrink-0 text-slate"
                  width={ICON_SM}
                  height={ICON_SM}
                  {...iconProps}
                />
                {text}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {posting ? (
            <Button asChild variant="primary">
              <a href={posting} target="_blank" rel="noopener noreferrer">
                {t("openPosting")}
                <ExternalLink width={ICON_SM} height={ICON_SM} {...iconProps} />
              </a>
            </Button>
          ) : null}
          {job.status === "new" || job.status === "saved" ? (
            <Button onClick={() => change(job.status === "new" ? "saved" : "new")}>
              {job.status === "new" ? t("save") : t("unsave")}
            </Button>
          ) : null}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm text-slate">{t("statusLabel")}</p>
          <StatusGroup value={job.status} onChange={change} />
        </div>
      </header>

      <aside className="flex flex-col gap-4 self-start rounded-panel bg-panel p-4 min-[1180px]:sticky min-[1180px]:top-0 min-[1180px]:col-start-2 min-[1180px]:row-span-3 min-[1180px]:row-start-1">
        <Score
          value={job.score}
          label={scoreT(scoreBand(job.score))}
          className="[&>span:first-child]:text-2xl"
        />
        {breakdown.parts.length > 0 ? (
          <PanelPart title={t("breakdown.title")}>
            <ScoreBreakdown parts={breakdown.parts} />
          </PanelPart>
        ) : null}
        {hasSkills ? (
          <PanelPart title={t("skills.title")}>
            {breakdown.matchedSkills.length > 0 ? (
              <>
                <h3 className="mb-2 text-xs text-slate">{t("skills.matched")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {breakdown.matchedSkills.map((skill) => (
                    <li key={skill}>
                      <Chip kind="matched">{skill}</Chip>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {missing.length > 0 ? (
              <>
                <h3 className="mt-3 mb-2 text-xs text-slate">{t("skills.missing")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {missing.map((skill) => (
                    <li key={skill}>
                      <Chip kind="missing">{skill}</Chip>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </PanelPart>
        ) : null}
        <PanelPart title={t("facts.title")}>
          <dl className="flex flex-col gap-3">
            {job.posted_at ? (
              <Fact label={t("facts.posted")}>{formatDate(job.posted_at, locale)}</Fact>
            ) : null}
            <Fact label={t("facts.source")}>{job.source}</Fact>
            {facts.languages.length > 0 ? (
              <Fact label={t("facts.languages")}>{facts.languages.join(", ")}</Fact>
            ) : null}
            {facts.visa !== null ? (
              <Fact label={t("facts.visa")}>{t(facts.visa ? "tri.yes" : "tri.no")}</Fact>
            ) : null}
            {facts.relocation !== null ? (
              <Fact label={t("facts.relocation")}>
                {t(facts.relocation ? "tri.yes" : "tri.no")}
              </Fact>
            ) : null}
          </dl>
        </PanelPart>
      </aside>

      <div className="flex min-w-0 flex-col gap-6 min-[1180px]:col-start-1">
        {job.explanation ? (
          <section className="border-t border-line pt-6">
            <h2 className="mb-3 text-md">{t("why.title")}</h2>
            <p dir="auto" className="max-w-[80ch] text-base">
              {job.explanation}
            </p>
            <p className="mt-2 text-xs text-slate">{t("why.byAi")}</p>
          </section>
        ) : null}
        <Description raw={job.description} summary={facts.summary} />
      </div>
    </article>
  );
}

/** The job side of the feed: loads one job and shows it. */
export function JobDetailScreen({ id }: { id: string }) {
  const t = useTranslations("job");
  const errors = useTranslations("errors");
  const search = useSearchParams();
  const suffix = feedQuery(parseFilter(search.get("status")), parseSort(search.get("sort")));
  const query = useJob(id);

  return (
    <div>
      <Link
        href={`/feed${suffix}`}
        className="mb-4 inline-flex items-center gap-2 text-base text-accent hover:text-accent-hover lg:hidden"
      >
        <ArrowLeft width={ICON_SM} height={ICON_SM} className="rtl:rotate-180" {...iconProps} />
        {t("back")}
      </Link>
      {query.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40" />
        </div>
      ) : query.isError ? (
        query.error instanceof ApiError && query.error.code === "job_not_found" ? (
          <EmptyState
            title={errors("job_not_found")}
            action={
              <Button asChild>
                <Link href={`/feed${suffix}`}>{t("notFoundAction")}</Link>
              </Button>
            }
          />
        ) : (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : (
        <Detail job={query.data} />
      )}
    </div>
  );
}
