import * as React from "react";
import { Score } from "@/components/ui/score";
import { cn } from "@/lib/utils/cn";

type JobRowProps = Omit<React.ComponentProps<"li">, "title" | "children"> & {
  title: string;
  /** Company, place and how long ago, on one quieter line. */
  meta: string;
  /** One line saying why the job matches (shown under the meta line). */
  reason?: string;
  /** The score, or null while it is not known yet. */
  score: number | null;
  /** The translated score word (Strong, Good, Partial). */
  scoreLabel?: string;
  selected?: boolean;
};

/**
 * One row of a job list: title, then company, place and age on a quieter line,
 * and the score at the end. The selected row has --tint as
 * its background; no side bar. Rows, not cards.
 */
export function JobRow({
  title,
  meta,
  reason,
  score,
  scoreLabel,
  selected = false,
  className,
  ...props
}: JobRowProps) {
  return (
    <li
      data-slot="job-row"
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex items-center gap-4 px-4 py-3 transition-colors duration-200 ease-out",
        selected && "bg-tint",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-medium text-ink">
          {title}
        </p>
        <p dir="auto" className="truncate text-sm text-slate">
          {meta}
        </p>
        {reason ? (
          <p dir="auto" className="mt-1 text-sm text-ink">
            {reason}
          </p>
        ) : null}
      </div>
      <Score value={score} label={scoreLabel} />
    </li>
  );
}
