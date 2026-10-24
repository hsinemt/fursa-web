"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Step = { key: string; title: string; text: string };

/**
 * "Pinned story": on laptop the stage stays on screen while the three steps scroll past;
 * the big numeral of the current step turns accent and the stage shows that step's scene.
 * On phone and tablet each scene sits under its step. `scenes` are server-rendered
 * elements, shown through CSS (see ".stage" in globals.css), so they stay plain markup.
 */
export function HowStory({ steps, scenes }: { steps: readonly Step[]; scenes: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  // The current step is the one whose text is closest to the middle of the screen.
  useEffect(() => {
    const update = () => {
      const middle = window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      items.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      setActive(best);
    };
    const start = window.setTimeout(update, 0);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(start);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="mt-2 lg:grid lg:grid-cols-2 lg:gap-16">
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.key}
            ref={(el) => {
              items.current[index] = el;
            }}
            data-index={index}
            data-active={active === index}
            className="group flex flex-col justify-center py-8 lg:min-h-[24rem]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "tabular font-heading text-numeral transition-colors duration-300 ease-out",
                active === index ? "text-accent" : "text-line",
              )}
            >
              {index + 1}
            </span>
            <div className="transition-opacity duration-300 ease-out lg:group-data-[active=false]:opacity-40">
              <h3 className="mt-4 font-heading text-title text-ink">{step.title}</h3>
              <p className="mt-3 max-w-md text-md text-slate">{step.text}</p>
            </div>
            <div className="mt-8 lg:hidden">{scenes[index]}</div>
          </li>
        ))}
      </ol>

      <div className="hidden lg:block">
        <div className="stage sticky top-[calc(50vh-12rem)] grid">
          {scenes.map((scene, index) => (
            <div
              key={steps[index]?.key ?? index}
              data-scene=""
              data-active={active === index}
              aria-hidden={active !== index}
              className="[grid-area:1/1]"
            >
              {scene}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
