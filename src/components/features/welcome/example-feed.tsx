import { useTranslations } from "next-intl";
import { JobRow } from "@/components/features/job-row";
import { Chip } from "@/components/ui/chip";
import { scoreBand } from "@/lib/utils/score";

const SAMPLE_JOBS = [
  { key: "one", score: 82 },
  { key: "two", score: 68 },
  { key: "three", score: 51 },
] as const;

/**
 * A real example of the feed, built from the same components as the app, with sample
 * data. It is labeled "Example" and is not interactive. Laptop: list beside detail.
 * Phone and tablet: the list, then the detail.
 */
export function ExampleFeed() {
  const t = useTranslations("welcome.example");
  const score = useTranslations("score");

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="overflow-hidden rounded-panel border border-line bg-panel"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3">
        <p className="font-medium text-ink">{t("count")}</p>
        <p className="text-sm text-slate">{t("order")}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <ul className="divide-y divide-line">
          {SAMPLE_JOBS.map(({ key, score: value }, index) => (
            <JobRow
              key={key}
              title={t(`jobs.${key}.title`)}
              meta={t(`jobs.${key}.meta`)}
              score={value}
              scoreLabel={score(scoreBand(value))}
              selected={index === 0}
            />
          ))}
        </ul>

        <div className="border-t border-line p-4 sm:p-6 lg:border-t-0 lg:border-s">
          <h3 className="font-heading text-lg text-ink">{t("jobs.one.title")}</h3>
          <p dir="auto" className="mt-1 text-slate">
            {t("detail.line")}
          </p>

          <dl className="my-4 grid grid-cols-3 gap-4 border-y border-line py-4">
            <div>
              <dt className="text-xs text-slate">{t("detail.level")}</dt>
              <dd className="mt-1 text-sm text-ink">{t("detail.levelValue")}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate">{t("detail.mode")}</dt>
              <dd className="mt-1 text-sm text-ink">{t("detail.modeValue")}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate">{t("detail.posted")}</dt>
              <dd className="mt-1 text-sm text-ink">{t("detail.postedValue")}</dd>
            </div>
          </dl>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs text-slate">{t("detail.matched")}</p>
              <div className="flex flex-wrap gap-2">
                <Chip kind="matched">Python</Chip>
                <Chip kind="matched">SQL</Chip>
                <Chip kind="matched">Docker</Chip>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate">{t("detail.missing")}</p>
              <div className="flex flex-wrap gap-2">
                <Chip kind="missing">Kubernetes</Chip>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h4 className="font-medium text-ink">{t("detail.whyTitle")}</h4>
              <span className="text-xs text-slate">{t("detail.byAi")}</span>
            </div>
            <p className="mt-2 max-w-prose text-ink">{t("detail.why")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
