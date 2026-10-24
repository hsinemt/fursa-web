"use client";

import { useEffect, useState } from "react";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import { SETTINGS_ICONS, type SettingsSection } from "./settings-card";

/**
 * The list of groups at the start of the settings page (laptop only). Each is a link to its
 * card; the one on screen is marked (tint and accent text, `aria-current`).
 */
export function SettingsRail({
  label,
  items,
}: {
  label: string;
  items: { id: SettingsSection; label: string }[];
}) {
  const [active, setActive] = useState<SettingsSection>(items[0]?.id ?? "language");

  useEffect(() => {
    const cards = items
      .map(({ id }) => document.getElementById(`settings-${id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (cards.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = cards.find((card) => visible.has(card.id));
        if (first) setActive(first.id.replace("settings-", "") as SettingsSection);
      },
      { rootMargin: "-10% 0px -60% 0px" },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label={label} className="hidden lg:sticky lg:top-6 lg:block">
      <ul className="flex flex-col gap-1">
        {items.map(({ id, label: text }) => {
          const Icon = SETTINGS_ICONS[id];
          const current = id === active;
          return (
            <li key={id}>
              <a
                href={`#settings-${id}`}
                aria-current={current ? "true" : undefined}
                onClick={() => setActive(id)}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-base",
                  current
                    ? "bg-tint font-medium text-accent"
                    : "text-slate hover:bg-tint hover:text-ink",
                )}
              >
                <Icon className="shrink-0" width={ICON_SM} height={ICON_SM} {...iconProps} />
                {text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
