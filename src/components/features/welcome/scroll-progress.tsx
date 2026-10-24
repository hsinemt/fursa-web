"use client";

import { useEffect, useRef } from "react";

/**
 * "Reading line": a 2 px accent line at the very top of the screen that grows with the
 * scroll position, from the start edge (the right in Arabic). Hidden with "reduce motion".
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    bar.style.transformOrigin = document.documentElement.dir === "rtl" ? "right" : "left";
    bar.hidden = false;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      hidden
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-accent"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
