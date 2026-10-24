import * as React from "react";
import { Score, ScoreRing } from "@/components/ui/score";
import { cn } from "@/lib/utils/cn";

type JobRowProps = Omit<React.ComponentProps<"li">, "title" | "children"> & {
  title: string;
  /** Company, place and how long ago, on one quieter line (or several: pass an array). */
  meta: string | string[];
  /** One line saying why the job matches (shown under the meta line). */
  reason?: string;
  /** The score, or null while it is not known yet. */
  score: number | null;
  /** The translated score word (Strong, Good, Partial). */
  scoreLabel?: string;
  /** Shown before the text (a company logo tile). */
  leading?: React.ReactNode;
  /** Shown under the score, at the end of the row (for example the job's status). */
  aside?: React.ReactNode;
  /** Makes the whole row a link: wraps the content in the link the caller builds. */
  link?: (content: React.ReactNode, className: string) => React.ReactNode;
  /** Show the score in a ring (the feed) instead of the plain number and word. */
  ring?: boolean;
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
  leading,
  aside,
  link,
  ring = false,
  selected = false,
  className,
  ...props
}: JobRowProps) {
  const lines = Array.isArray(meta) ? meta : [meta];
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-medium text-ink">
          {title}
        </p>
        {lines.map((line, i) => (
          <p key={i} dir="auto" className={cn("truncate text-sm text-slate", i > 0 && "text-xs")}>
            {line}
          </p>
        ))}
        {reason ? (
          <p dir="auto" className="mt-1 line-clamp-2 text-sm text-ink">
            {reason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 self-start">
        {ring ? (
          <ScoreRing value={score} label={scoreLabel} />
        ) : (
          <Score value={score} label={scoreLabel} />
        )}
        {aside}
      </div>
    </>
  );
  const layout = "flex items-start gap-3 px-4 py-3";

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
      {link ? link(content, cn(layout, "hover:bg-tint")) : content}
    </li>
  );
}
