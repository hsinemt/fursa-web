"use client";

import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api, call } from "@/lib/api";
import { feedKeys } from "@/lib/feed/hooks";
import {
  insertByScore,
  removeFromPages,
  setStatusInPages,
  type FeedPage,
  type JobDetail,
  type JobSummary,
  type UserJobStatus,
} from "@/lib/feed/values";

type Pages = InfiniteData<FeedPage, unknown>;

/** The status a feed list is for, from its key (`["feed", "saved"]`), or "all". */
function listStatus(key: readonly unknown[]): string {
  return String(key[1] ?? "all");
}

/**
 * Moves a job to another status for the pipeline board: it leaves the column it was in and joins
 * the new one (in score order, when that column is loaded) before the API answers, and
 * everything goes back if the API refuses. `PUT /v1/jobs/{id}/status`.
 */
export function useMoveJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; from: UserJobStatus; to: UserJobStatus }) =>
      call(
        api.PUT("/v1/jobs/{job_id}/status", {
          params: { path: { job_id: id } },
          body: { status: to },
        }),
      ),
    onMutate: async ({ id, from, to }) => {
      await client.cancelQueries({ queryKey: feedKeys.all });
      const lists = client.getQueriesData<Pages>({ queryKey: feedKeys.all });
      const detail = client.getQueryData<JobDetail>(feedKeys.job(id));

      let job: JobSummary | null = null;
      for (const [key, data] of lists) {
        if (listStatus(key) !== from) continue;
        job = removeFromPages(data, id).removed;
        if (job) break;
      }
      job ??=
        lists
          .flatMap(([, data]) => data?.pages.flatMap((p) => p.items) ?? [])
          .find((item) => item.job_id === id) ?? null;
      const moved = job ? { ...job, status: to } : null;

      for (const [key, data] of lists) {
        const which = listStatus(key);
        if (which === from && from !== to) {
          client.setQueryData(key, removeFromPages(data, id).data);
        } else if (which === to && moved) {
          client.setQueryData(key, insertByScore(data, moved));
        } else if (which === "all") {
          client.setQueryData(key, setStatusInPages(data, id, to));
        }
      }
      if (detail) client.setQueryData(feedKeys.job(id), { ...detail, status: to });
      return { lists, detail, id };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.lists) client.setQueryData(key, data);
      client.setQueryData(feedKeys.job(context.id), context.detail);
    },
    onSuccess: (job) => {
      client.setQueryData(feedKeys.job(job.job_id), job);
      // The lists were edited by hand: ask the API again on the next visit.
      void client.invalidateQueries({ queryKey: feedKeys.all, refetchType: "none" });
    },
  });
}
