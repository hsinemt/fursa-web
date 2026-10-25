"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, GripVertical, MapPin, MoreHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { CompanyLogo } from "@/components/ui/company-logo";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Score } from "@/components/ui/score";
import { Link } from "@/i18n/navigation";
import { timeAgo, type JobSummary, type UserJobStatus } from "@/lib/feed/values";
import { cn } from "@/lib/utils/cn";
import { scoreBand } from "@/lib/utils/score";

/** The four columns, left to right. */
export const COLUMNS = ["saved", "applied", "interview", "rejected"] as const;
export type Column = (typeof COLUMNS)[number];
export const isColumn = (value: unknown): value is Column =>
  COLUMNS.some((column) => column === value);

/**
 * What a card shows, top to bottom: the company (logo tile, name, then the actions), the title,
 * the place, and a footer with the score and how long ago the job was posted. Used by the card
 * in a column and by the copy that follows the pointer.
 */
export function CardBody({ job, actions }: { job: JobSummary; actions?: React.ReactNode }) {
  const scoreT = useTranslations("score");
  const locale = useLocale();
  const place = job.location ?? job.country;
  const ago = timeAgo(job.posted_at, new Date(), locale);

  return (
    <>
      <div className="flex items-center gap-2">
        <CompanyLogo name={job.company} src={job.company_logo_url} size="sm" />
        <p dir="auto" className="min-w-0 flex-1 truncate text-sm text-slate">
          {job.company}
        </p>
        {actions}
      </div>
      <Link
        href={`/jobs/${job.job_id}`}
        dir="auto"
        className="mt-3 line-clamp-2 block font-medium text-ink hover:underline"
      >
        {job.title}
      </Link>
      {place ? (
        <p dir="auto" className="mt-1 flex items-center gap-1.5 text-sm text-slate">
          <MapPin className="shrink-0" width={14} height={14} {...iconProps} />
          <span className="truncate">{place}</span>
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Score value={job.score} label={scoreT(scoreBand(job.score))} />
        {ago ? <span className="text-xs text-slate">{ago}</span> : null}
      </div>
    </>
  );
}

/** "Move to": the way to change a status without dragging (touch, or anyone who cannot drag). */
export function MoveMenu({
  job,
  from,
  onMove,
  variant = "icon",
}: {
  job: JobSummary;
  from: UserJobStatus;
  onMove: (to: UserJobStatus) => void;
  /** "icon": the dots on a card. "status": a "Status" button with a chevron (list rows). */
  variant?: "icon" | "status";
}) {
  const t = useTranslations("pipeline");
  const statusT = useTranslations("status");
  const locale = useLocale();
  const targets = COLUMNS.filter((column) => column !== from);

  const item =
    "flex cursor-pointer items-center rounded-control px-3 py-2 text-base text-ink outline-none data-[highlighted]:bg-tint pointer-coarse:py-3";

  return (
    <DropdownMenu.Root dir={locale === "ar" ? "rtl" : "ltr"}>
      <DropdownMenu.Trigger asChild>
        {variant === "status" ? (
          <button
            type="button"
            aria-label={t("moveMenu", { title: job.title })}
            className="inline-flex h-9 items-center gap-2 rounded-control border border-control px-3 text-base text-ink hover:bg-tint pointer-coarse:h-11"
          >
            {t("statusMenu")}
            <ChevronDown width={ICON_SM} height={ICON_SM} {...iconProps} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("moveMenu", { title: job.title })}
            className="inline-flex size-8 items-center justify-center rounded-control text-slate hover:bg-tint hover:text-ink pointer-coarse:size-11"
          >
            <MoreHorizontal width={ICON_SM} height={ICON_SM} {...iconProps} />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-48 rounded-panel border border-line bg-panel p-1 font-sans text-base text-ink shadow-menu"
        >
          <DropdownMenu.Label className="px-3 py-2 text-sm text-slate">
            {t("moveTo")}
          </DropdownMenu.Label>
          {targets.map((target) => (
            <DropdownMenu.Item key={target} className={item} onSelect={() => onMove(target)}>
              {statusT(target)}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={() => onMove("new")}>
            {t("backToNew")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * One job on the board. It can be dragged by the pointer from anywhere on the card (a short
 * press still opens the job), by the keyboard from the grip button, and moved with the menu.
 * While it is dragged, the card stays behind as a faded dashed ghost.
 */
export function BoardCard({
  job,
  status,
  onMove,
}: {
  job: JobSummary;
  status: Column;
  onMove: (to: UserJobStatus) => void;
}) {
  const t = useTranslations("pipeline");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: job.job_id,
    data: { from: status },
  });

  return (
    <li
      ref={setNodeRef}
      {...listeners}
      data-slot="board-card"
      className={cn(
        "rounded-panel border bg-panel p-3 transition-colors duration-150 ease-out",
        "motion-safe:animate-[card-in_200ms_ease-out_both]",
        isDragging
          ? "border-dashed border-control opacity-40"
          : "border-line hover:border-control hover:bg-page",
      )}
    >
      <CardBody
        job={job}
        actions={
          <span className="flex items-center">
            <MoveMenu job={job} from={status} onMove={onMove} />
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              aria-label={t("dragHandle", { title: job.title })}
              className="inline-flex size-8 cursor-grab items-center justify-center rounded-control text-slate hover:bg-tint hover:text-ink pointer-coarse:hidden"
            >
              <GripVertical width={ICON_SM} height={ICON_SM} {...iconProps} />
            </button>
          </span>
        }
      />
    </li>
  );
}
