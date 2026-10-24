import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { JobRow } from "@/components/features/job-row";
import { scoreBand } from "@/lib/utils/score";

const index = (i: number) => ({ "--i": i }) as CSSProperties;

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-panel p-6">
      <p className="text-xs text-slate">{title}</p>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span dir="auto" className="rounded-chip bg-tint px-2 py-1 text-sm text-accent">
      {children}
    </span>
  );
}

/** Step 1: the profile: roles, skills, places and level appear one by one. */
export function ProfileScene() {
  const t = useTranslations("welcome.scenes.profile");
  const rows: { key: string; label: string; values: string[] }[] = [
    { key: "roles", label: t("roles"), values: [t("role")] },
    { key: "skills", label: t("skills"), values: ["Python", "SQL", "Docker"] },
    { key: "places", label: t("places"), values: [t("placeOne"), t("placeTwo")] },
    { key: "level", label: t("level"), values: [t("levelValue")] },
  ];
  return (
    <Frame title={t("title")}>
      <dl className="mt-4 space-y-5">
        {rows.map((row, i) => (
          <div key={row.key} className="scene-in" style={index(i)}>
            <dt className="text-sm text-slate">{row.label}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {row.values.map((value) => (
                <Tag key={value}>{value}</Tag>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

const SCORING = [
  { key: "three", score: 51 },
  { key: "one", score: 82 },
  { key: "two", score: 68 },
  { key: "four", score: 47 },
] as const;

/** Step 2: each job is scored: the number counts up and a thin bar fills. */
export function ScoringScene() {
  const t = useTranslations("welcome.scenes.scoring");
  const jobs = useTranslations("welcome.example.jobs");
  const fourth = useTranslations("welcome.services.pipeline");
  return (
    <Frame title={t("title")}>
      <ul className="mt-2 divide-y divide-line">
        {SCORING.map((job, i) => (
          <li key={job.key} className="scene-in py-4" style={index(i)}>
            <div className="flex items-baseline justify-between gap-4">
              <p dir="auto" className="truncate font-medium text-ink">
                {job.key === "four" ? fourth("fourth") : jobs(`${job.key}.title`)}
              </p>
              <span className="tabular font-heading text-lg text-accent">
                <span className="sr-only">{job.score}</span>
                <span
                  aria-hidden="true"
                  className="count count-scene"
                  style={{ "--to": job.score } as CSSProperties}
                />
              </span>
            </div>
            <div className="mt-3 h-1 rounded-chip bg-line">
              <div
                className="scene-bar h-full rounded-chip bg-accent"
                style={{ "--w": `${job.score}%`, "--i": i } as CSSProperties}
              />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Step 3: a short list with reasons, and an alert on Telegram. */
export function AlertScene() {
  const t = useTranslations("welcome.scenes.alert");
  const jobs = useTranslations("welcome.example.jobs");
  const score = useTranslations("score");
  return (
    <div className="space-y-4">
      <div className="scene-in rounded-panel border border-line bg-panel p-6" style={index(0)}>
        <p className="flex items-baseline justify-between gap-4">
          <span className="font-medium text-ink">{t("channel")}</span>
          <span className="text-sm text-slate">{t("title")}</span>
        </p>
        <p dir="auto" className="mt-3 rounded-panel bg-tint p-4 text-ink">
          {t("text")}
        </p>
      </div>
      <ul
        className="scene-in overflow-hidden rounded-panel border border-line bg-panel"
        style={index(1)}
      >
        <JobRow
          title={jobs("one.title")}
          meta={jobs("one.meta")}
          reason={jobs("one.reason")}
          score={82}
          scoreLabel={score(scoreBand(82))}
          selected
        />
      </ul>
    </div>
  );
}
