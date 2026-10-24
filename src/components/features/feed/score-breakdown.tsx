import { useTranslations } from "next-intl";
import type { Breakdown } from "@/lib/feed/values";

/**
 * The parts of the score: a name, a thin bar and the number (0 to 100). Plain bars, no gauges.
 * The number carries the meaning; the bar is only a picture of it.
 */
export function ScoreBreakdown({ parts }: { parts: Breakdown["parts"] }) {
  const t = useTranslations("job.breakdown.parts");
  return (
    <ul className="flex max-w-xl flex-col gap-3">
      {parts.map(({ key, value }) => (
        <li key={key} className="flex items-center gap-4">
          <span className="w-44 shrink-0 text-sm text-ink">{t(key)}</span>
          <span aria-hidden="true" className="h-1 flex-1 rounded-chip bg-line">
            <span className="block h-1 rounded-chip bg-accent" style={{ width: `${value}%` }} />
          </span>
          <span className="tabular w-8 shrink-0 text-end text-sm text-ink">{value}</span>
        </li>
      ))}
    </ul>
  );
}
