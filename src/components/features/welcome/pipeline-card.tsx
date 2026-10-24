"use client";

import { Check, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Score } from "@/components/ui/score";
import { cn } from "@/lib/utils/cn";

type Step = { key: string; label: string; time: string };

type PipelineCardProps = {
  label: string;
  tag: string;
  title: string;
  company: string;
  steps: readonly Step[];
  workingLabel: string;
  doneLabel: string;
  resultText: string;
  score: number;
  scoreLabel: string;
  replayLabel: string;
};

/** How long each step runs. The thin bar on the running step fills in the same time. */
const STEP_MS = 900;

function Marker({ state }: { state: "waiting" | "running" | "done" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-chip transition-colors duration-200 ease-out",
        state === "done" && "bg-accent text-on-accent",
        state === "running" && "border-2 border-accent",
        state === "waiting" && "border border-control",
      )}
    >
      {state === "done" ? <Check width={ICON_SM - 4} height={ICON_SM - 4} {...iconProps} /> : null}
    </span>
  );
}

/**
 * "Pipeline" sequence: the steps one job goes through before you hear about it. Each step
 * runs for a moment (a thin bar fills), then ticks with its time, until the result shows.
 * Plays once when the card scrolls into view, and again on Replay. The final state is what
 * the server renders and what is shown when scripts are off or "reduce motion" is on.
 * Rows are separated by top and bottom hairlines only: no connecting line down the side.
 */
export function PipelineCard({
  label,
  tag,
  title,
  company,
  steps,
  workingLabel,
  doneLabel,
  resultText,
  score,
  scoreLabel,
  replayLabel,
}: PipelineCardProps) {
  const total = steps.length;
  // -1: waiting to start. 0..total-1: that step is running. total: all done (final state).
  const [step, setStep] = useState(total);
  const [canReplay, setCanReplay] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const played = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    clearTimers();
    setStep(0);
    for (let next = 1; next <= total; next += 1) {
      timers.current.push(window.setTimeout(() => setStep(next), next * STEP_MS));
    }
  }, [clearTimers, total]);

  // Get ready just before the card is on screen, and play when it is.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ready = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played.current) return;
        setCanReplay(true);
        setStep(-1);
        ready.disconnect();
      },
      { rootMargin: "300px 0px" },
    );
    const start = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played.current) return;
        played.current = true;
        play();
        start.disconnect();
      },
      { threshold: 0.6 },
    );
    ready.observe(card);
    start.observe(card);
    return () => {
      ready.disconnect();
      start.disconnect();
      clearTimers();
    };
  }, [play, clearTimers]);

  const finished = step >= total;
  const running = step >= 0 && step < total;

  return (
    <div>
      <div
        ref={cardRef}
        role="region"
        aria-label={label}
        className="rounded-panel border border-line bg-panel"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p dir="auto" className="font-heading text-lg text-ink">
              {title}
            </p>
            <p dir="auto" className="text-sm text-slate">
              {company}
            </p>
          </div>
          <span className="shrink-0 text-xs text-slate">{tag}</span>
        </div>

        <ol className="divide-y divide-line px-4 sm:px-6">
          {steps.map((item, index) => {
            const state = index < step ? "done" : index === step ? "running" : "waiting";
            return (
              <li
                key={item.key}
                aria-current={state === "running" ? "step" : undefined}
                className="py-3"
              >
                <div className="flex items-center gap-3">
                  <Marker state={state} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 transition-colors duration-200 ease-out",
                      state === "waiting" ? "text-slate" : "text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  <time
                    className={cn(
                      "tabular text-sm text-slate transition-opacity duration-200 ease-out",
                      state === "done" ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {item.time}
                  </time>
                </div>
                {state === "running" ? (
                  <div aria-hidden="true" className="ms-8 mt-2 h-0.5 rounded-chip bg-line">
                    <div className="bar-run h-full rounded-chip bg-accent" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="border-t border-line px-4 py-4 sm:px-6">
          {finished ? (
            <p className="fade-in flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <Score value={score} label={scoreLabel} />
              <span className="text-ink">{resultText}</span>
            </p>
          ) : (
            <p className="flex items-center gap-3 text-ink">
              <span aria-hidden="true" className="flex items-center gap-1">
                <span className="dot-pulse size-1.5 rounded-full bg-slate" />
                <span className="dot-pulse size-1.5 rounded-full bg-slate [animation-delay:150ms]" />
                <span className="dot-pulse size-1.5 rounded-full bg-slate [animation-delay:300ms]" />
              </span>
              {workingLabel}
            </p>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {running ? (steps[step]?.label ?? "") : finished ? doneLabel : ""}
        </p>
      </div>

      {canReplay ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={play} disabled={!finished}>
            <RotateCcw width={ICON_SM} height={ICON_SM} {...iconProps} />
            {replayLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
