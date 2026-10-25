import {
  EMPLOYMENT_TYPES,
  LEVELS,
  parseFilter,
  parseSort,
  WORK_MODES,
  type EmploymentType,
  type Level,
  type Sort,
  type UserJobStatus,
  type WorkMode,
} from "./values";

/** What the feed's address says: the status tab, the order and the filters. */
export type FeedParams = {
  status: UserJobStatus | null;
  sort: Sort;
  /** Words in the title, company or place. */
  q: string;
  /** Only matches scoring at least this. */
  minScore: number | null;
  workModes: WorkMode[];
  levels: Level[];
  types: EmploymentType[];
  /** Only jobs posted in the last N days. */
  days: number | null;
};

/** The choices the filter panel offers (the API accepts any whole number in its range). */
export const MIN_SCORE_OPTIONS = [60, 70, 75] as const;
export const DAYS_OPTIONS = [1, 3, 7, 30] as const;
export const MAX_SEARCH_CHARS = 100;

export const NO_FILTERS = {
  q: "",
  minScore: null,
  workModes: [],
  levels: [],
  types: [],
  days: null,
} as const satisfies Partial<FeedParams>;

type Reader = { get(name: string): string | null };

/** The values of a comma-separated parameter that are in the list, once each, in list order. */
function pick<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  const given = new Set((raw ?? "").split(",").map((part) => part.trim()));
  return allowed.filter((value) => given.has(value));
}

function whole(raw: string | null, min: number, max: number): number | null {
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

/** Reads the address. Anything unknown or out of range is ignored, never an error. */
export function parseParams(search: Reader): FeedParams {
  return {
    status: parseFilter(search.get("status")),
    sort: parseSort(search.get("sort")),
    q: (search.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_CHARS),
    minScore: whole(search.get("score"), 1, 100),
    workModes: pick(search.get("mode"), WORK_MODES),
    levels: pick(search.get("level"), LEVELS),
    types: pick(search.get("type"), EMPLOYMENT_TYPES),
    days: whole(search.get("days"), 1, 90),
  };
}

/** The address for these params: "" when everything is at its default, else "?a=b&...". */
export function paramsQuery(params: FeedParams): string {
  const parts: [string, string][] = [];
  if (params.status) parts.push(["status", params.status]);
  if (params.sort === "newest") parts.push(["sort", "newest"]);
  if (params.q) parts.push(["q", params.q]);
  if (params.minScore !== null) parts.push(["score", String(params.minScore)]);
  if (params.workModes.length > 0) parts.push(["mode", params.workModes.join(",")]);
  if (params.levels.length > 0) parts.push(["level", params.levels.join(",")]);
  if (params.types.length > 0) parts.push(["type", params.types.join(",")]);
  if (params.days !== null) parts.push(["days", String(params.days)]);
  if (parts.length === 0) return "";
  return `?${parts.map(([key, value]) => `${key}=${encodeURIComponent(value).replaceAll("%2C", ",")}`).join("&")}`;
}

/** How many filter groups are on (the search words count as one). The status and the order are not filters. */
export function filterCount(params: FeedParams): number {
  return [
    params.q !== "",
    params.minScore !== null,
    params.workModes.length > 0,
    params.levels.length > 0,
    params.types.length > 0,
    params.days !== null,
  ].filter(Boolean).length;
}

/** The same params with every filter off (the status and the order stay). */
export function withoutFilters(params: FeedParams): FeedParams {
  return { ...params, ...NO_FILTERS, workModes: [], levels: [], types: [] };
}

/** The part of the params that goes to the API as filters. `undefined` leaves a parameter out. */
export function apiFilters(
  params: Pick<FeedParams, "q" | "minScore" | "workModes" | "levels" | "types" | "days">,
) {
  return {
    q: params.q || undefined,
    min_score: params.minScore ?? undefined,
    work_mode: params.workModes.length > 0 ? params.workModes : undefined,
    level: params.levels.length > 0 ? params.levels : undefined,
    employment_type: params.types.length > 0 ? params.types : undefined,
    posted_within_days: params.days ?? undefined,
  };
}
