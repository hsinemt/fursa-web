"use client";

import { useEffect, useState } from "react";

/**
 * Seconds left of a wait, counting down once a second. Pass null for no wait. When `seconds`
 * changes (a new wait), the count starts again.
 */
export function useCountdown(seconds: number | null): number {
  const [state, setState] = useState({ from: seconds, left: seconds ?? 0 });
  if (state.from !== seconds) setState({ from: seconds, left: seconds ?? 0 });

  useEffect(() => {
    if (!seconds) return;
    const timer = setInterval(
      () => setState((current) => ({ ...current, left: Math.max(0, current.left - 1) })),
      1000,
    );
    return () => clearInterval(timer);
  }, [seconds]);

  return state.from === seconds ? state.left : (seconds ?? 0);
}
