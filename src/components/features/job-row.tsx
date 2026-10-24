import * as React from "react";
import { Score } from "@/components/ui/score";
import { cn } from "@/lib/utils/cn";

type JobRowProps = {
  title: string;
  /** Company, place and how long ago, on one quieter line. */
  meta: string;
  score: number;
  /** The translated score word (Strong, Good, Partial). */
  scoreLabel: string;
  selected?: boolean;
};

/**
 * One row of a job list: title, then company, place and age on a quieter line,
 * and the score at the end. The selected row has --tint and a 3 px accent bar on
 * its start edge (it flips to the right in Arabic). Rows, not cards.
 */
export function JobRow({ title, meta, score, scoreLabel, selected = false }: JobRowProps) {
  return (
    <li
      data-slot="job-row"
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-4 border-s-[3px] px-4 py-3",
        selected ? "border-accent bg-tint" : "border-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-medium text-ink">
          {title}
        </p>
        <p dir="auto" className="truncate text-sm text-slate">
          {meta}
        </p>
      </div>
      <Score value={score} label={scoreLabel} />
    </li>
  );
}
