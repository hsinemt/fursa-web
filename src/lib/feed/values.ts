import type { InfiniteData } from "@tanstack/react-query";
import type { components } from "@/lib/api";

export type JobSummary = components["schemas"]["JobSummary"];
export type JobDetail = components["schemas"]["JobDetail"];
export type FeedPage = components["schemas"]["FeedResponse"];
export type UserJobStatus = components["schemas"]["UserJobStatus"];

export const STATUSES: readonly UserJobStatus[] = [
  "new",
  "saved",
  "applied",
  "interview",
  "rejected",
];

/** The `?status=` value of the address: a known status, or null for "all". */
export function parseFilter(raw: string | null | undefined): UserJobStatus | null {
  return STATUSES.find((status) => status === raw) ?? null;
}

export type Sort = "best" | "newest";

/** The `?sort=` value of the address. */
export function parseSort(raw: string | null | undefined): Sort {
  return raw === "newest" ? "newest" : "best";
}

/** The query part of a feed or job address that keeps the filter and the sort. */
export function feedQuery(status: UserJobStatus | null, sort: Sort): string {
  const parts = [status ? `status=${status}` : "", sort === "newest" ? "sort=newest" : ""].filter(
    Boolean,
  );
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** Newest posting first (jobs without a date last). "best" keeps the API order. */
export function sortJobs(items: JobSummary[], sort: Sort): JobSummary[] {
  if (sort === "best") return items;
  const time = (job: JobSummary) => (job.posted_at ? Date.parse(job.posted_at) || 0 : 0);
  return items
    .map((job, index) => ({ job, index }))
    .sort((a, b) => time(b.job) - time(a.job) || a.index - b.index)
    .map(({ job }) => job);
}

// ---------------------------------------------------------------------------
// Scraped text is untrusted: it becomes plain text here and React escapes it.
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(value: string): string {
  return value.replace(
    /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z]{2,8}));/gi,
    (match, dec, hex, name) => {
      if (name) return NAMED_ENTITIES[String(name).toLowerCase()] ?? match;
      const code = dec ? Number(dec) : parseInt(hex, 16);
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    },
  );
}

// Text that was UTF-8 but read as Windows-1252 or Latin-1 somewhere upstream ("â€™" for an
// apostrophe, "Ã©" for é). Each run is turned back into bytes and decoded again; a run that
// is not valid UTF-8 stays as it is.
const CP1252: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  ƒ: 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  ˆ: 0x88,
  "‰": 0x89,
  Š: 0x8a,
  "‹": 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  š: 0x9a,
  "›": 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};
const MOJIBAKE = /[Â-ô][-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]{1,3}/g;

export function repairText(value: string): string {
  if (!/[Â-ô]/.test(value)) return value;
  return value.replace(MOJIBAKE, (run) => {
    const bytes = Uint8Array.from(Array.from(run), (ch) => CP1252[ch] ?? ch.charCodeAt(0));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return run;
    }
  });
}

// Control characters (including the C1 range) and the bidi overrides that can make text read in a different order.
const UNSAFE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;

/**
 * A posting's description as plain text. Tags (and the content of script and style tags) are
 * dropped, block tags and line breaks become line breaks, entities are decoded, and control
 * and direction-override characters are removed. The result is only ever rendered as text.
 */
export function htmlToText(raw: string | null | undefined): string {
  if (!raw) return "";
  let out = repairText(raw).replace(/\r\n?/g, "\n");
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<li\b[^>]*>/gi, "\n- ");
  out = out.replace(/<\/(?:p|div|li|ul|ol|h[1-6]|tr|table|section|article)\s*>/gi, "\n\n");
  out = out.replace(/<\/?[a-z][^>]*>/gi, "");
  out = decodeEntities(out);
  out = out.replace(UNSAFE_CHARS, "");
  return out
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain text split into paragraphs (blank lines); single line breaks stay inside a paragraph. */
export function paragraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** An address that is safe to open: http or https only (never javascript:, data:...). */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dates and money (Western digits in every language, see fursa design.md)
// ---------------------------------------------------------------------------

const latin = (locale: string) => `${locale}-u-nu-latn`;

/** "3 days ago" in the person's language, or "" when the date is missing or invalid. */
export function timeAgo(iso: string | null | undefined, now: Date, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((then - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(latin(locale), { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** A full date for the facts grid, or "" when missing or invalid. */
export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(latin(locale), { dateStyle: "medium" }).format(date);
}

// ---------------------------------------------------------------------------
// `extracted` and `breakdown` are free-form objects in the contract. Only the keys read
// here are used, each checked; anything else is ignored.
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(str).filter((item): item is string => item !== null) : [];

export const LEVELS = ["intern", "junior", "mid", "senior", "lead", "principal"] as const;
export type Level = (typeof LEVELS)[number];
const asLevel = (value: unknown): Level | null => LEVELS.find((level) => level === value) ?? null;

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const SALARY_PERIODS = ["hour", "day", "month", "year"] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export type Salary = {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: SalaryPeriod | null;
};

export type Facts = {
  level: Level | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  salary: Salary | null;
  techStack: string[];
  languages: string[];
  visa: boolean | null;
  relocation: boolean | null;
};

const amount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

function tri(value: unknown): boolean | null {
  return value === "yes" ? true : value === "no" ? false : null;
}

/** What the facts grid and the top line show. A fact that is unknown is null (left out). */
export function readFacts(job: Pick<JobDetail, "extracted" | "breakdown" | "remote">): Facts {
  const extracted = isRecord(job.extracted) ? job.extracted : {};
  const breakdown = isRecord(job.breakdown) ? job.breakdown : {};

  let workMode = WORK_MODES.find((mode) => mode === extracted.remote_type) ?? null;
  if (workMode === null && job.remote === true) workMode = "remote";

  let salary: Salary | null = null;
  const raw = extracted.salary;
  if (isRecord(raw)) {
    const min = amount(raw.min);
    const max = amount(raw.max);
    const currency = str(raw.currency);
    if (min !== null || max !== null) {
      salary = {
        min,
        max,
        currency: currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : null,
        period: SALARY_PERIODS.find((p) => p === raw.period) ?? null,
      };
    }
  }

  return {
    level: asLevel(extracted.seniority) ?? asLevel(breakdown.job_level),
    workMode,
    employmentType: EMPLOYMENT_TYPES.find((kind) => kind === extracted.employment_type) ?? null,
    salary,
    techStack: strList(extracted.tech_stack),
    languages: strList(extracted.languages),
    visa: tri(extracted.visa_sponsorship),
    relocation: tri(extracted.relocation_support),
  };
}

/** "50,000 – 70,000 EUR" (without the period, which the screen translates). */
export function formatSalary(salary: Salary, locale: string): string {
  const numbers = new Intl.NumberFormat(latin(locale), { maximumFractionDigits: 0 });
  const { min, max, currency } = salary;
  const range =
    min !== null && max !== null && min !== max
      ? `${numbers.format(min)} – ${numbers.format(max)}`
      : numbers.format(min ?? max ?? 0);
  return currency ? `${range} ${currency}` : range;
}

/** The parts of the score, in the order the screen lists them. */
export const SCORE_PARTS = [
  "title",
  "skills",
  "location",
  "seniority",
  "recency",
  "similarity",
] as const;
export type ScorePart = (typeof SCORE_PARTS)[number];

export type Breakdown = {
  /** Only the parts the score used, each 0 to 100. */
  parts: { key: ScorePart; value: number }[];
  matchedSkills: string[];
};

export function readBreakdown(raw: unknown): Breakdown {
  const breakdown = isRecord(raw) ? raw : {};
  const components = isRecord(breakdown.components) ? breakdown.components : {};
  const parts = SCORE_PARTS.flatMap((key) => {
    const value = components[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return [];
    return [{ key, value: Math.round(Math.min(1, Math.max(0, value)) * 100) }];
  });
  return { parts, matchedSkills: strList(breakdown.matched_skills) };
}

/** Skills the posting names that the matched list does not contain (case-insensitive). */
export function missingSkills(techStack: string[], matched: string[]): string[] {
  const have = new Set(matched.map((skill) => skill.toLocaleLowerCase()));
  return techStack.filter((skill) => !have.has(skill.toLocaleLowerCase()));
}

// ---------------------------------------------------------------------------
// Cache updates for status changes (optimistic)
// ---------------------------------------------------------------------------

type Pages = InfiniteData<FeedPage, unknown>;

/** The same pages with one job's status replaced. Returns the input when nothing changes. */
export function setStatusInPages(
  data: Pages | undefined,
  jobId: string,
  status: UserJobStatus,
): Pages | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    if (!page.items.some((item) => item.job_id === jobId && item.status !== status)) return page;
    changed = true;
    return {
      ...page,
      items: page.items.map((item) => (item.job_id === jobId ? { ...item, status } : item)),
    };
  });
  return changed ? { ...data, pages } : data;
}

/** Items of all loaded pages, in order. A job that appears on two pages is kept once. */
export function flattenPages(data: Pages | undefined): JobSummary[] {
  const seen = new Set<string>();
  const items: JobSummary[] = [];
  for (const page of data?.pages ?? []) {
    for (const item of page.items) {
      if (seen.has(item.job_id)) continue;
      seen.add(item.job_id);
      items.push(item);
    }
  }
  return items;
}
