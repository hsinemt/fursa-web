import { useTranslations } from "next-intl";
import type { Breakdown } from "@/lib/feed/values";

/**
 * The parts of the score: a name and its number (0 to 100) on one line, a thin bar under
 * them. Plain bars, no gauges. The number carries the meaning; the bar is only a picture of it.
 */
export function ScoreBreakdown({ parts }: { parts: Breakdown["parts"] }) {
  const t = useTranslations("job.breakdown.parts");
  return (
    <ul className="flex flex-col gap-3">
      {parts.map(({ key, value }) => (
        <li key={key}>
          <div className="flex items-baseline justify-between gap-3 text-sm text-ink">
            <span>{t(key)}</span>
            <span className="tabular">{value}</span>
          </div>
          <div aria-hidden="true" className="mt-1 h-1 rounded-chip bg-line">
            <div className="h-1 rounded-chip bg-accent" style={{ width: `${value}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
