"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
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
  parseFilter,
  readBreakdown,
  readFacts,
  safeHttpUrl,
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
  const topLine = [
    job.company,
    facts.workMode ? t(`workMode.${facts.workMode}`) : null,
    facts.employmentType ? t(`employment.${facts.employmentType}`) : null,
    salary,
  ].filter((part): part is string => Boolean(part));

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

  return (
    <article className="flex flex-col gap-6">
      <header>
        <h1 dir="auto" className="text-xl">
          {job.title}
        </h1>
        <p dir="auto" className="mt-2 text-base text-slate">
          {topLine.join(" · ")}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Score value={job.score} label={scoreT(scoreBand(job.score))} />
          {job.is_active ? null : <span className="text-sm text-slate">{t("closed")}</span>}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
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

      <Section title={t("facts.title")}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {facts.level ? <Fact label={t("facts.level")}>{levelT(facts.level)}</Fact> : null}
          {facts.workMode ? (
            <Fact label={t("facts.workMode")}>{t(`workMode.${facts.workMode}`)}</Fact>
          ) : null}
          {facts.employmentType ? (
            <Fact label={t("facts.type")}>{t(`employment.${facts.employmentType}`)}</Fact>
          ) : null}
          {place ? <Fact label={t("facts.place")}>{place}</Fact> : null}
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

      {job.explanation ? (
        <Section title={t("why.title")}>
          <p dir="auto" className="max-w-[72ch] text-base">
            {job.explanation}
          </p>
          <p className="mt-2 text-xs text-slate">{t("why.byAi")}</p>
        </Section>
      ) : null}

      {breakdown.parts.length > 0 ? (
        <Section title={t("breakdown.title")}>
          <ScoreBreakdown parts={breakdown.parts} />
        </Section>
      ) : null}

      <Section title={t("description.title")}>
        <Description raw={job.description} />
      </Section>

      <Section title={t("statusLabel")}>
        <StatusGroup value={job.status} onChange={change} />
      </Section>
    </article>
  );
}

/** The job side of the feed: loads one job and shows it. */
export function JobDetailScreen({ id }: { id: string }) {
  const t = useTranslations("job");
  const errors = useTranslations("errors");
  const status = parseFilter(useSearchParams().get("status"));
  const suffix = status ? `?status=${status}` : "";
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
