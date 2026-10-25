"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { api, call } from "@/lib/api";
import { feedKeys, FILTER_DEFAULTS, type FeedOptions } from "./keys";
import { apiFilters } from "./params";

export { feedKeys };
export type { FeedOptions };
import { setStatusInPages, type FeedPage, type JobDetail, type UserJobStatus } from "./values";

/** Jobs per request. Never load everything: the next page comes from `next_cursor`. */
export const PAGE_SIZE = 20;

type Pages = InfiniteData<FeedPage, unknown>;

export function useFeed(status: UserJobStatus | null, options: FeedOptions = {}) {
  const sort = options.sort ?? "best";
  const filters = { ...FILTER_DEFAULTS, ...options.filters };
  return useInfiniteQuery({
    queryKey: feedKeys.list(status, options),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      call(
        api.GET("/v1/feed", {
          params: {
            query: {
              status: status ?? undefined,
              limit: PAGE_SIZE,
              cursor: pageParam ?? undefined,
              sort: sort === "best" ? undefined : sort,
              ...apiFilters(filters),
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: feedKeys.job(id),
    queryFn: () => call(api.GET("/v1/jobs/{job_id}", { params: { path: { job_id: id } } })),
  });
}

/**
 * `PUT /v1/jobs/{id}/status`, shown at once and undone if the API refuses: the job's detail
 * and every loaded feed list change before the answer, and go back to what they were on error.
 */
export function useSetStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserJobStatus }) =>
      call(
        api.PUT("/v1/jobs/{job_id}/status", {
          params: { path: { job_id: id } },
          body: { status },
        }),
      ),
    onMutate: async ({ id, status }) => {
      await client.cancelQueries({ queryKey: feedKeys.all });
      await client.cancelQueries({ queryKey: feedKeys.job(id) });
      const lists = client.getQueriesData<Pages>({ queryKey: feedKeys.all });
      const detail = client.getQueryData<JobDetail>(feedKeys.job(id));
      for (const [key, data] of lists) client.setQueryData(key, setStatusInPages(data, id, status));
      if (detail) client.setQueryData(feedKeys.job(id), { ...detail, status });
      return { lists, detail, id };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.lists) client.setQueryData(key, data);
      client.setQueryData(feedKeys.job(context.id), context.detail);
    },
    onSuccess: (job) => {
      client.setQueryData(feedKeys.job(job.job_id), job);
      // A job that changed status may belong in another filter now: reload lists on next visit.
      void client.invalidateQueries({ queryKey: feedKeys.all, refetchType: "none" });
    },
  });
}
