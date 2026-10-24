"use client";

import { useEffect, useRef } from "react";

type Step = { key: string; title: string; text: string };

/**
 * "How it works" as a ledger: serif numerals down the margin, joined by a 2 px line.
 * "Ledger line" sequence: each segment of the accent line fills (200 ms) as its step
 * scrolls into view. Final state by default; scripts only mark steps still below the fold.
 */
export function Ledger({ steps }: { steps: readonly Step[] }) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(list.children) as HTMLElement[];
    const pending = items.filter((li) => li.getBoundingClientRect().top > window.innerHeight * 0.7);
    pending.forEach((li) => (li.dataset.ledger = "pending"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            (entry.target as HTMLElement).dataset.ledger = "reached";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    pending.forEach((li) => observer.observe(li));
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={listRef}>
      {steps.map((step, index) => (
        <li key={step.key} className="relative ps-12 pb-8 last:pb-0">
          <span
            aria-hidden="true"
            className="tabular absolute start-0 top-0 w-8 text-center font-heading text-xl leading-8 text-accent"
          >
            {index + 1}
          </span>
          {index < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute start-[15px] top-10 bottom-1 w-0.5 bg-line"
            >
              <span className="ledger-fill block size-full bg-accent" />
            </span>
          ) : null}
          <h3 className="font-medium leading-8 text-ink">{step.title}</h3>
          <p className="mt-1 max-w-prose text-slate">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
