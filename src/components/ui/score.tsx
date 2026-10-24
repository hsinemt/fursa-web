import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The match score: the number in the heading font (tabular, accent),
 * followed by its word band in slate. Never green or red.
 * `label` is the translated band word, so this component stays free of i18n.
 * `value` is null while a score is not known yet (a dash is shown).
 */
function Score({
  value,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & { value: number | null; label?: string }) {
  return (
    <span
      data-slot="score"
      className={cn("inline-flex items-baseline gap-2", className)}
      {...props}
    >
      <span className="tabular font-heading text-lg font-medium text-accent">
        {value === null ? "—" : Math.round(value)}
      </span>
      {label ? <span className="text-sm text-slate">{label}</span> : null}
    </span>
  );
}

export { Score };
