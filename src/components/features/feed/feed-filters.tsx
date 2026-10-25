"use client";

import { ListFilter, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import {
  DAYS_OPTIONS,
  filterCount,
  MAX_SEARCH_CHARS,
  MIN_SCORE_OPTIONS,
  withoutFilters,
  type FeedParams,
} from "@/lib/feed/params";
import { EMPLOYMENT_TYPES, LEVELS, WORK_MODES } from "@/lib/feed/values";
import { cn } from "@/lib/utils/cn";

/** Waits this long after the last key before the search goes into the address. */
export const SEARCH_DELAY_MS = 350;

/**
 * The search field: title, company or place. It keeps what is typed at once and updates the
 * address after a short pause, so every keystroke does not reload the list. When the address
 * changes from outside (Clear filters, Back), the field follows it.
 */
export function SearchBox({ value, onCommit }: { value: string; onCommit: (q: string) => void }) {
  const t = useTranslations("feed.filters");
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(next: string) {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next.replace(/\s+/g, " ").trim()), SEARCH_DELAY_MS);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate"
        width={ICON_SM}
        height={ICON_SM}
        {...iconProps}
      />
      <input
        type="search"
        value={text}
        maxLength={MAX_SEARCH_CHARS}
        onChange={(event) => change(event.target.value)}
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        className="h-9 w-full rounded-control border border-control bg-panel ps-9 pe-3 text-sm text-ink placeholder:text-slate pointer-coarse:h-11"
      />
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="mb-2 text-sm text-slate">
        {legend}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-control border px-2.5 text-sm pointer-coarse:h-11",
        pressed
          ? "border-accent bg-tint font-medium text-accent"
          : "border-control text-ink hover:bg-tint",
      )}
    >
      {children}
    </button>
  );
}

/** Adds the value when it is not there, takes it out when it is. */
function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * The "Filters" button and the panel it opens: work mode, level, job type, how recent, minimum
 * score. Every choice applies at once. The button shows how many groups are on.
 */
export function FiltersPopover({
  params,
  onChange,
}: {
  params: FeedParams;
  onChange: (next: FeedParams) => void;
}) {
  const t = useTranslations("feed.filters");
  const job = useTranslations("job");
  const levelT = useTranslations("profile.seniority.options");
  const count = filterCount(params);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-control border px-3 text-sm pointer-coarse:h-11",
            count > 0
              ? "border-accent bg-tint font-medium text-accent"
              : "border-control text-ink hover:bg-tint",
          )}
        >
          <ListFilter width={ICON_SM} height={ICON_SM} {...iconProps} />
          {t("button")}
          {count > 0 ? (
            <span
              aria-label={t("active", { count })}
              className="tabular rounded-chip bg-accent px-1.5 text-xs text-on-accent"
            >
              {count}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("title")}
          className="z-50 flex max-h-[min(34rem,var(--radix-popover-content-available-height))] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col gap-5 overflow-y-auto rounded-panel border border-line bg-panel p-4 font-sans text-base text-ink shadow-menu"
        >
          <Group legend={t("workMode")}>
            {WORK_MODES.map((mode) => (
              <Chip
                key={mode}
                pressed={params.workModes.includes(mode)}
                onClick={() => onChange({ ...params, workModes: toggle(params.workModes, mode) })}
              >
                {job(`workMode.${mode}`)}
              </Chip>
            ))}
          </Group>
          <Group legend={t("level")}>
            {LEVELS.map((level) => (
              <Chip
                key={level}
                pressed={params.levels.includes(level)}
                onClick={() => onChange({ ...params, levels: toggle(params.levels, level) })}
              >
                {levelT(level)}
              </Chip>
            ))}
          </Group>
          <Group legend={t("type")}>
            {EMPLOYMENT_TYPES.map((type) => (
              <Chip
                key={type}
                pressed={params.types.includes(type)}
                onClick={() => onChange({ ...params, types: toggle(params.types, type) })}
              >
                {job(`employment.${type}`)}
              </Chip>
            ))}
          </Group>
          <Group legend={t("posted")}>
            <Chip
              pressed={params.days === null}
              onClick={() => onChange({ ...params, days: null })}
            >
              {t("any")}
            </Chip>
            {DAYS_OPTIONS.map((days) => (
              <Chip
                key={days}
                pressed={params.days === days}
                onClick={() => onChange({ ...params, days })}
              >
                {t(`days.${days}`)}
              </Chip>
            ))}
          </Group>
          <Group legend={t("score")}>
            <Chip
              pressed={params.minScore === null}
              onClick={() => onChange({ ...params, minScore: null })}
            >
              {t("any")}
            </Chip>
            {MIN_SCORE_OPTIONS.map((score) => (
              <Chip
                key={score}
                pressed={params.minScore === score}
                onClick={() => onChange({ ...params, minScore: score })}
              >
                {t("scoreAtLeast", { score })}
              </Chip>
            ))}
          </Group>
          {count > 0 ? (
            <div className="border-t border-line pt-3">
              <Button variant="ghost" onClick={() => onChange(withoutFilters(params))}>
                {t("clear")}
              </Button>
            </div>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
