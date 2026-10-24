import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The match score: the number in the interface font (tabular, medium, accent), followed by its
 * word band in slate. Never green or red.
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
      <span className="tabular text-md font-medium text-accent">
        {value === null ? "—" : Math.round(value)}
      </span>
      {label ? <span className="text-sm text-slate">{label}</span> : null}
    </span>
  );
}

const RING_SIZES = {
  sm: { box: 40, stroke: 3, text: "text-sm" },
  lg: { box: 72, stroke: 4, text: "text-xl" },
} as const;

/**
 * The score in a thin flat ring: an accent arc on a line-colored track, filled from the top in
 * proportion to the score, with the number inside and the word under it. The number is always
 * written; the ring is only a picture of it (hidden from screen readers).
 */
function ScoreRing({
  value,
  label,
  size = "sm",
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  value: number | null;
  label?: string;
  size?: keyof typeof RING_SIZES;
}) {
  const { box, stroke, text } = RING_SIZES[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const share = value === null ? 0 : Math.min(1, Math.max(0, value / 100));

  return (
    <span
      data-slot="score-ring"
      className={cn("inline-flex flex-col items-center gap-1", className)}
      {...props}
    >
      <span className="relative inline-flex" style={{ width: box, height: box }}>
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-line"
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * share} ${circumference}`}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
            className="stroke-accent"
          />
        </svg>
        <span
          className={cn(
            "tabular absolute inset-0 flex items-center justify-center font-medium text-accent",
            text,
          )}
        >
          {value === null ? "—" : Math.round(value)}
        </span>
      </span>
      {label ? <span className="text-xs text-slate">{label}</span> : null}
    </span>
  );
}

export { Score, ScoreRing };
