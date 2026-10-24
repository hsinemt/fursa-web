"use client";

import { createElement, Fragment, useEffect, useId, type CSSProperties } from "react";

type RevealTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  id?: string;
  /** "load": plays when the page loads (hero). "scroll": plays when it scrolls into view. */
  mode?: "load" | "scroll";
};

/**
 * "Word rise" sequence: a headline rises word by word out of a mask. The words stay in
 * one element in reading order, so screen readers read the headline as normal text.
 * Final state by default (server render, no scripts, reduce motion); in "scroll" mode the
 * script only hides the words while the headline is still below the fold.
 */
export function RevealText({ text, as = "h2", className, id, mode = "scroll" }: RevealTextProps) {
  const uid = useId();

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-uid="${CSS.escape(uid)}"]`);
    if (mode !== "scroll" || !el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    el.dataset.words = "pending";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.words = "in";
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, uid]);

  const words = text.split(" ");
  return createElement(
    as,
    { "data-uid": uid, id, className, "data-words": mode === "load" ? "load" : "" },
    words.map((word, index) => (
      <Fragment key={index}>
        <span className="word">
          <span className="word-inner" style={{ "--i": index } as CSSProperties}>
            {word}
          </span>
        </span>
        {index < words.length - 1 ? " " : null}
      </Fragment>
    )),
  );
}
