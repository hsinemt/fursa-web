import type { FeedParams } from "./params";
import type { Sort, UserJobStatus } from "./values";

/** The order and the filters of a list. Nothing set means the plain list (best first). */
export type FeedOptions = {
  sort?: Sort;
  filters?: Partial<Pick<FeedParams, "q" | "minScore" | "workModes" | "levels" | "types" | "days">>;
};

export const FILTER_DEFAULTS = {
  q: "",
  minScore: null,
  workModes: [],
  levels: [],
  types: [],
  days: null,
};

export const feedKeys = {
  all: ["feed"] as const,
  /**
   * `["feed", status]` for the plain list, and `["feed", status, { sort, filters }]` when there is
   * an order or a filter. The status stays second: code that edits lists by status reads it there.
   */
  list: (status: UserJobStatus | null, options: FeedOptions = {}) => {
    const sort = options.sort ?? "best";
    const filters = { ...FILTER_DEFAULTS, ...options.filters };
    const plain = sort === "best" && JSON.stringify(filters) === JSON.stringify(FILTER_DEFAULTS);
    return plain
      ? (["feed", status ?? "all"] as const)
      : (["feed", status ?? "all", { sort, filters }] as const);
  },
  job: (id: string) => ["job", id] as const,
};
