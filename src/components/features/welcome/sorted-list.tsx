"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { JobRow } from "@/components/features/job-row";
import { Button } from "@/components/ui/button";
import { ICON_SM, iconProps } from "@/components/ui/icon";

export type SortedJob = {
  id: string;
  title: string;
  meta: string;
  reason: string;
  score: number;
  scoreLabel: string;
};

type Phase = "done" | "shuffled" | "scoring";

const COUNT_MS = 600;
const SHUFFLE_PAUSE_MS = 350;
const SLIDE_MS = 200;
const SLIDE_STAGGER_MS = 60;

const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** Counts from 0 to `target` while `running`, for the "Sorted for you" sequence. */
function useCountUp(target: number, running: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      setValue(Math.round(target * easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, target]);
  return value;
}

function AnimatedRow({
  job,
  phase,
  selected,
  rowRef,
}: {
  job: SortedJob;
  phase: Phase;
  selected: boolean;
  rowRef: (el: HTMLLIElement | null) => void;
}) {
  const counted = useCountUp(job.score, phase === "scoring");
  const score = phase === "done" ? job.score : phase === "scoring" ? counted : null;
  return (
    <JobRow
      ref={rowRef}
      title={job.title}
      meta={job.meta}
      reason={job.reason}
      score={score}
      scoreLabel={phase === "done" ? job.scoreLabel : undefined}
      selected={selected}
    />
  );
}

/**
 * "Sorted for you" sequence. `jobs` arrive best first. The rows start in a mixed order
 * with no scores, a thin accent rule passes down the list while each score counts up,
 * then the rows slide into best-first order. It plays once when the list scrolls into
 * view, and again on Replay. The final state is what the server renders, and what is
 * shown when scripts are off or "reduce motion" is on.
 */
export function SortedList({
  jobs,
  label,
  replayLabel,
}: {
  jobs: readonly SortedJob[];
  label: string;
  replayLabel: string;
}) {
  const [phase, setPhase] = useState<Phase>("done");
  const [canReplay, setCanReplay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const before = useRef<Map<string, number> | null>(null);
  const timers = useRef<number[]>([]);
  const played = useRef(false);

  // A mixed order for the start of the sequence: last, first, middle.
  const shuffled = [jobs[jobs.length - 1], ...jobs.slice(0, -1)].filter(
    (job): job is SortedJob => job !== undefined,
  );
  const ordered = phase === "done" ? jobs : shuffled;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const measure = useCallback(() => {
    const map = new Map<string, number>();
    rows.current.forEach((el, id) => map.set(id, el.getBoundingClientRect().top));
    return map;
  }, []);

  const sweep = useCallback(() => {
    const rule = ruleRef.current;
    const container = containerRef.current;
    if (!rule || !container || typeof rule.animate !== "function") return;
    const distance = container.offsetHeight - 2;
    rule.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: `translateY(${distance}px)`, opacity: 1, offset: 0.9 },
        { transform: `translateY(${distance}px)`, opacity: 0 },
      ],
      { duration: COUNT_MS + 100, easing: "ease-out" },
    );
  }, []);

  const play = useCallback(() => {
    clearTimers();
    setPhase("shuffled");
    later(() => {
      setPhase("scoring");
      sweep();
    }, SHUFFLE_PAUSE_MS);
    later(
      () => {
        before.current = measure();
        setPhase("done");
      },
      SHUFFLE_PAUSE_MS + COUNT_MS + 150,
    );
  }, [clearTimers, later, measure, sweep]);

  // Slide each row from where it was to where it is now (measured, so any text length works).
  useLayoutEffect(() => {
    if (phase !== "done" || !before.current) return;
    const previous = before.current;
    before.current = null;
    let index = 0;
    for (const job of jobs) {
      const el = rows.current.get(job.id);
      const from = previous.get(job.id);
      if (!el || from === undefined || typeof el.animate !== "function") continue;
      const delta = from - el.getBoundingClientRect().top;
      if (delta !== 0) {
        el.animate([{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }], {
          duration: SLIDE_MS,
          delay: index * SLIDE_STAGGER_MS,
          easing: "ease-out",
          fill: "backwards",
        });
      }
      index += 1;
    }
  }, [phase, jobs]);

  // Get ready just before the list is on screen, and play when it is.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ready = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || played.current) return;
        setCanReplay(true);
        setPhase("shuffled");
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
    ready.observe(container);
    start.observe(container);
    return () => {
      ready.disconnect();
      start.disconnect();
      clearTimers();
    };
  }, [play, clearTimers]);

  return (
    <div>
      <div ref={containerRef} role="region" aria-label={label} className="relative">
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
          {ordered.map((job, index) => (
            <AnimatedRow
              key={job.id}
              job={job}
              phase={phase}
              selected={phase === "done" && index === 0}
              rowRef={(el) => {
                if (el) rows.current.set(job.id, el);
                else rows.current.delete(job.id);
              }}
            />
          ))}
        </ul>
        <span
          ref={ruleRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent opacity-0"
        />
      </div>
      {canReplay ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={play} disabled={phase !== "done"}>
            <RotateCcw width={ICON_SM} height={ICON_SM} {...iconProps} />
            {replayLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
