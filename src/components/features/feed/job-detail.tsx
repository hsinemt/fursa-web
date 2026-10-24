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
import { scoreBand } from "@/lib/utils/score";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-slate">{label}</dt>
      <dd dir="auto" className="text-base text-ink">
        {children}
      </dd>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-t border-line pt-6">
    <h2 className="mb-3 text-md">{title}</h2>
    {children}
  </section>
);

/** The description, as plain paragraphs. Never HTML: see "Scraped text is untrusted". */
function Description({ raw }: { raw: string | null }) {
  const t = useTranslations("job.description");
  const blocks = paragraphs(htmlToText(raw));
  if (blocks.length === 0) return <p className="text-slate">{t("empty")}</p>;
  return (
    <div className="max-w-[72ch] space-y-4">
      {blocks.map((block, i) => (
        <p key={i} dir="auto" className="whitespace-pre-line text-base">
          {block}
        </p>
      ))}
    </div>
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

  return (
    <article className="flex flex-col gap-6">
      <header className="grid gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
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
            <ul className="mt-4 flex flex-col gap-2">
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
        </div>

        <aside className="self-start rounded-panel bg-panel p-4">
          <Score
            value={job.score}
            label={scoreT(scoreBand(job.score))}
            className="[&>span:first-child]:text-2xl"
          />
          {breakdown.parts.length > 0 ? (
            <>
              <h2 className="mt-4 mb-3 text-sm text-slate">{t("breakdown.title")}</h2>
              <ScoreBreakdown parts={breakdown.parts} />
            </>
          ) : null}
        </aside>
      </header>

      {job.explanation ? (
        <Section title={t("why.title")}>
          <p dir="auto" className="max-w-[72ch] text-base">
            {job.explanation}
          </p>
          <p className="mt-2 text-xs text-slate">{t("why.byAi")}</p>
        </Section>
      ) : null}

      {breakdown.matchedSkills.length > 0 || missing.length > 0 ? (
        <Section title={t("skills.title")}>
          {breakdown.matchedSkills.length > 0 ? (
            <>
              <h3 className="mb-2 text-sm text-slate">{t("skills.matched")}</h3>
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
              <h3 className="mt-4 mb-2 text-sm text-slate">{t("skills.missing")}</h3>
              <ul className="flex flex-wrap gap-2">
                {missing.map((skill) => (
                  <li key={skill}>
                    <Chip kind="missing">{skill}</Chip>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}

      <Section title={t("facts.title")}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
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
            <Fact label={t("facts.relocation")}>{t(facts.relocation ? "tri.yes" : "tri.no")}</Fact>
          ) : null}
        </dl>
      </Section>

      <Section title={t("description.title")}>
        <Description raw={job.description} />
      </Section>
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
