"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The floating header of the public pages: a --panel bar with a hairline border and 8 px
 * corners, inset from the page edges, that stays on screen while scrolling. It gets the
 * soft menu shadow once the page has scrolled (see "Layout" in fursa design.md).
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(update); // in case the browser restored a scroll position
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <header className="sticky top-3 z-40 px-4 pt-3 sm:px-6">
      <div
        data-scrolled={scrolled}
        className={cn(
          "mx-auto flex h-14 w-full max-w-5xl items-center gap-6 rounded-panel border border-line bg-panel px-4 transition-shadow duration-200 ease-out",
          scrolled && "shadow-menu",
        )}
      >
        {children}
      </div>
    </header>
  );
}
