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
  /** Shown under the score, at the end of the row (for example the job's status). */
  aside?: React.ReactNode;
  /** Makes the whole row a link: wraps the content in the link the caller builds. */
  link?: (content: React.ReactNode, className: string) => React.ReactNode;
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
  aside,
  link,
  selected = false,
  className,
  ...props
}: JobRowProps) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-medium text-ink">
          {title}
        </p>
        <p dir="auto" className="truncate text-sm text-slate">
          {meta}
        </p>
        {reason ? (
          <p dir="auto" className="mt-1 line-clamp-2 text-sm text-ink">
            {reason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Score value={score} label={scoreLabel} />
        {aside}
      </div>
    </>
  );
  const layout = "flex items-center gap-4 px-4 py-3";

  return (
    <li
      data-slot="job-row"
      aria-current={!link && selected ? "true" : undefined}
      className={cn(
        "transition-colors duration-200 ease-out",
        !link && layout,
        selected && "bg-tint",
        className,
      )}
      {...props}
    >
      {link ? link(content, cn(layout, "rounded-control hover:bg-tint")) : content}
    </li>
  );
}
