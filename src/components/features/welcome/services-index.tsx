"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tabs } from "radix-ui";
import { JobRow } from "@/components/features/job-row";
import { Chip } from "@/components/ui/chip";
import { Status } from "@/components/ui/status";
import { getDirection } from "@/i18n/routing";
import { scoreBand } from "@/lib/utils/score";

const SERVICES = ["feed", "why", "alerts", "pipeline"] as const;
type Service = (typeof SERVICES)[number];

function SampleFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("welcome.services");
  return (
    <div className="mt-4 rounded-panel border border-line bg-panel">
      <p className="border-b border-line px-4 py-2 text-xs text-slate">{t("sample")}</p>
      {children}
    </div>
  );
}

function FeedSample() {
  const t = useTranslations("welcome.example.jobs");
  const score = useTranslations("score");
  return (
    <SampleFrame>
      <ul className="divide-y divide-line">
        {(["one", "two"] as const).map((key, index) => {
          const value = key === "one" ? 82 : 68;
          return (
            <JobRow
              key={key}
              title={t(`${key}.title`)}
              meta={t(`${key}.meta`)}
              score={value}
              scoreLabel={score(scoreBand(value))}
              selected={index === 0}
            />
          );
        })}
      </ul>
    </SampleFrame>
  );
}

function WhySample() {
  const t = useTranslations("welcome.example.detail");
  return (
    <SampleFrame>
      <div className="space-y-4 p-4">
        <div>
          <p className="mb-2 text-xs text-slate">{t("matched")}</p>
          <div className="flex flex-wrap gap-2">
            <Chip kind="matched">Python</Chip>
            <Chip kind="matched">SQL</Chip>
            <Chip kind="matched">Docker</Chip>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-slate">{t("missing")}</p>
          <Chip kind="missing">Kubernetes</Chip>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="font-medium text-ink">{t("whyTitle")}</p>
            <span className="text-xs text-slate">{t("byAi")}</span>
          </div>
          <p className="mt-2 max-w-prose text-ink">{t("why")}</p>
        </div>
      </div>
    </SampleFrame>
  );
}

function AlertsSample() {
  const t = useTranslations("welcome.services.alerts");
  const rows: [string, string][] = [
    [t("email"), t("daily")],
    [t("telegram"), t("instant")],
    [t("minScore"), "60"],
    [t("digest"), "08"],
  ];
  return (
    <SampleFrame>
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-slate">{label}</dt>
            <dd className="tabular font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </SampleFrame>
  );
}

function PipelineSample() {
  const status = useTranslations("status");
  const jobs = useTranslations("welcome.example.jobs");
  const pipeline = useTranslations("welcome.services.pipeline");
  const rows = [
    { status: "saved", title: jobs("one.title") },
    { status: "applied", title: jobs("two.title") },
    { status: "interview", title: jobs("three.title") },
    { status: "rejected", title: pipeline("fourth") },
  ] as const;
  return (
    <SampleFrame>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.status} className="flex items-center justify-between gap-4 px-4 py-3">
            <Status status={row.status}>{status(row.status)}</Status>
            <span dir="auto" className="truncate text-slate">
              {row.title}
            </span>
          </li>
        ))}
      </ul>
    </SampleFrame>
  );
}

const SAMPLES: Record<Service, () => React.JSX.Element> = {
  feed: FeedSample,
  why: WhySample,
  alerts: AlertsSample,
  pipeline: PipelineSample,
};

/**
 * Services as an index: name, dotted leader, short description. Choosing one shows its
 * description and a small labeled sample beside the list (below it on phones).
 */
export function ServicesIndex() {
  const t = useTranslations("welcome.services");
  const locale = useLocale();

  return (
    <Tabs.Root
      defaultValue="feed"
      orientation="vertical"
      dir={getDirection(locale)}
      className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10"
    >
      <Tabs.List aria-label={t("listLabel")} className="flex flex-col border-t border-line">
        {SERVICES.map((key) => (
          <Tabs.Trigger
            key={key}
            value={key}
            className="group flex w-full items-baseline gap-3 border-b border-line px-3 py-3 text-start transition-colors duration-150 ease-out hover:bg-tint data-[state=active]:bg-tint"
          >
            <span className="font-heading text-md text-ink group-data-[state=active]:text-accent">
              {t(`${key}.name`)}
            </span>
            <span
              aria-hidden="true"
              className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-control"
            />
            <span className="text-sm text-slate">{t(`${key}.line`)}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="mt-6 lg:mt-0">
        {SERVICES.map((key) => {
          const Sample = SAMPLES[key];
          return (
            <Tabs.Content key={key} value={key} className="fade-in">
              <p className="max-w-prose text-ink">{t(`${key}.text`)}</p>
              <Sample />
            </Tabs.Content>
          );
        })}
      </div>
    </Tabs.Root>
  );
}
