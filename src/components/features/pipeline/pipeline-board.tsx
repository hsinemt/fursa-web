"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadError } from "@/components/features/feed/load-error";
import { Button } from "@/components/ui/button";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { useFeed } from "@/lib/feed/hooks";
import { flattenPages, type JobSummary, type UserJobStatus } from "@/lib/feed/values";
import { matchesSearch } from "@/lib/pipeline/values";
import { useMoveJob } from "@/lib/pipeline/hooks";
import { cn } from "@/lib/utils/cn";
import { BoardCard, CardBody, COLUMNS, isColumn, type Column } from "./pipeline-card";
import { PipelineList } from "./pipeline-list";

type FeedQuery = ReturnType<typeof useFeed>;

/** A column: its header, its cards, "Load more". A drop on it moves the dragged job here. */
function BoardColumn({
  status,
  query,
  visible,
  mode,
  search,
  onMove,
}: {
  status: Column;
  query: FeedQuery;
  search: string;
  visible: boolean;
  mode: "board" | "list";
  onMove: (job: JobSummary, from: Column, to: UserJobStatus) => void;
}) {
  const t = useTranslations("pipeline");
  const statusT = useTranslations("status");
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const loaded = flattenPages(query.data);
  const items = loaded.filter((job) => matchesSearch(job, search));

  return (
    <section
      ref={setNodeRef}
      aria-label={statusT(status)}
      className={cn(
        "min-h-[24rem] min-w-0 rounded-panel border p-2 transition-colors duration-150 ease-out",
        isOver ? "border-accent bg-tint" : "border-transparent",
        visible ? "block" : "hidden sm:block",
        mode === "list" && !visible && "sm:hidden",
        mode === "board" && "sm:w-72 sm:shrink-0 sm:snap-start lg:w-auto",
      )}
    >
      <h2 className="flex items-center justify-between gap-2 border-b border-line pb-2 text-md">
        <Status status={status} className="text-md">
          {statusT(status)}
        </Status>
        {query.data ? (
          <span className="tabular rounded-chip bg-panel px-2 py-0.5 text-sm text-slate">
            {items.length}
            {query.hasNextPage ? "+" : ""}
          </span>
        ) : null}
      </h2>

      <div className="mt-3">
        {query.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-36 rounded-panel" />
            <Skeleton className="h-36 rounded-panel" />
          </div>
        ) : query.isError && !query.data ? (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-panel border border-dashed border-line px-4 py-6 text-center">
            {loaded.length > 0 ? (
              <p className="text-sm text-slate">{t("noMatch")}</p>
            ) : (
              <>
                <p className="font-medium text-ink">{t("empty.title")}</p>
                <p className="mt-1 text-sm text-slate">{t("empty.text")}</p>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {items.map((job) => (
                <BoardCard
                  key={job.job_id}
                  job={job}
                  status={status}
                  onMove={(to) => onMove(job, status, to)}
                />
              ))}
            </ul>
            {query.isFetchNextPageError ? (
              <LoadError
                className="mt-3"
                error={query.error}
                onRetry={() => void query.fetchNextPage()}
              />
            ) : query.hasNextPage ? (
              <div className="mt-3">
                <Button
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {t("loadMore")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The pipeline board: Saved, Applied, Interview, Rejected. One feed query per status. Jobs move
 * by drag and drop, by keyboard, or with the "Move to" menu on every card.
 */
export function PipelineBoard() {
  const t = useTranslations("pipeline");
  const page = useTranslations("pages.pipeline");
  const statusT = useTranslations("status");
  const toast = useToast();
  const move = useMoveJob();

  // One query per column (the same lists as the feed's status filter).
  const saved = useFeed("saved");
  const applied = useFeed("applied");
  const interview = useFeed("interview");
  const rejected = useFeed("rejected");
  const queries: Record<Column, FeedQuery> = { saved, applied, interview, rejected };

  const [view, setView] = useState<"board" | "list">("board");
  const [tab, setTab] = useState<Column>("saved");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState<JobSummary | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function find(id: string | number): JobSummary | null {
    for (const column of COLUMNS) {
      const job = flattenPages(queries[column].data).find((item) => item.job_id === id);
      if (job) return job;
    }
    return null;
  }

  function moveJob(job: JobSummary, from: UserJobStatus, to: UserJobStatus) {
    if (from === to) return;
    move.mutate(
      { id: job.job_id, from, to },
      {
        onSuccess: () => toast.show(t("moved", { status: statusT(to) })),
        onError: () => toast.show(t("moveFailed")),
      },
    );
  }

  function onDragStart(event: DragStartEvent) {
    setDragging(find(event.active.id));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const job = find(active.id);
    const from = active.data.current?.from;
    if (!job || !isColumn(from) || !over || !isColumn(over.id)) return;
    moveJob(job, from, over.id);
  }

  const title = (id: string | number) => find(id)?.title ?? "";
  const where = (id: string | number | undefined) =>
    id !== undefined && isColumn(id) ? statusT(id) : "";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl">{page("title")}</h1>
          <p className="mt-2 text-slate">{t("intro")}</p>
        </div>
        <div
          role="group"
          aria-label={t("view.label")}
          className="hidden gap-0.5 rounded-control bg-panel p-0.5 sm:flex"
        >
          {(["board", "list"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                "h-8 rounded-control px-3 text-sm",
                view === key ? "bg-page font-medium text-ink" : "text-slate hover:text-ink",
              )}
            >
              {t(`view.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate"
          width={ICON_SM}
          height={ICON_SM}
          {...iconProps}
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t("search.label")}
          placeholder={t("search.placeholder")}
          className="h-10 w-full rounded-control border border-control bg-panel ps-9 pe-3 text-base text-ink placeholder:text-slate pointer-coarse:h-11"
        />
      </div>

      <div
        role="tablist"
        aria-label={t("tabs")}
        className="mt-4 flex gap-1 overflow-x-auto sm:hidden"
      >
        {COLUMNS.map((column) => (
          <button
            key={column}
            type="button"
            role="tab"
            aria-selected={tab === column}
            onClick={() => setTab(column)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-control px-3 text-base pointer-coarse:h-11",
              tab === column
                ? "bg-tint font-medium text-accent"
                : "text-slate hover:bg-tint hover:text-ink",
            )}
          >
            <Status status={column} className="text-base text-current">
              {statusT(column)}
            </Status>
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
        accessibility={{
          screenReaderInstructions: { draggable: t("dnd.instructions") },
          announcements: {
            onDragStart: ({ active }) => t("dnd.pickedUp", { title: title(active.id) }),
            onDragOver: ({ active, over }) =>
              over ? t("dnd.over", { title: title(active.id), status: where(over.id) }) : undefined,
            onDragEnd: ({ active, over }) =>
              over
                ? t("dnd.dropped", { title: title(active.id), status: where(over.id) })
                : t("dnd.cancelled", { title: title(active.id) }),
            onDragCancel: ({ active }) => t("dnd.cancelled", { title: title(active.id) }),
          },
        }}
      >
        <div
          className={cn(
            "mt-4",
            view === "board"
              ? "sm:flex sm:snap-x sm:gap-4 sm:overflow-x-auto sm:pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible"
              : "sm:hidden",
          )}
        >
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column}
              status={column}
              query={queries[column]}
              search={search}
              visible={tab === column}
              mode={view}
              onMove={moveJob}
            />
          ))}
        </div>
        {view === "list" ? (
          <div className="mt-4 hidden sm:block">
            <PipelineList queries={queries} search={search} onMove={moveJob} />
          </div>
        ) : null}
        <DragOverlay>
          {dragging ? (
            <div className="rounded-panel border border-accent bg-panel p-3 shadow-menu">
              <CardBody job={dragging} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
