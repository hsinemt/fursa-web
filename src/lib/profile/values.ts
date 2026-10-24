import type { components } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";

export type Profile = components["schemas"]["ProfileResponse"];
export type ProfileUpdate = components["schemas"]["ProfileUpdate"];
export type Seniority = NonNullable<ProfileUpdate["seniority"]>;

export const SENIORITIES: readonly Seniority[] = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
];

/** The API's limits (ProfileUpdate in the contract). */
export const LIMITS = { roles: 50, skills: 200, locations: 50 } as const;

/** What the profile form holds. Salary is text while it is typed. */
export type ProfileValues = {
  roles: string[];
  skills: string[];
  locations: string[];
  seniority: Seniority | "";
  salaryMin: string;
  salaryMax: string;
  currency: string;
};

export type SalaryField = "salaryMin" | "salaryMax" | "currency";
/** A key under profile.validation. */
export type ProfileProblems = Partial<Record<SalaryField, string>>;

/** "  Data   engineer " becomes "Data engineer". */
export function cleanTag(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Text typed or pasted into a tag field: commas, semicolons and new lines separate items. */
export function splitTags(text: string): string[] {
  return text
    .split(/[,;\n\r،؛]+/)
    .map(cleanTag)
    .filter(Boolean);
}

/**
 * Adds what was typed to a list: duplicates (any letter case) are ignored, and the list
 * never grows past `max`. `full` says something was left out because of the limit.
 */
export function addTags(
  list: readonly string[],
  text: string,
  max: number,
): { list: string[]; full: boolean } {
  const next = [...list];
  let full = false;
  for (const tag of splitTags(text)) {
    if (next.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue;
    if (next.length >= max) {
      full = true;
      continue;
    }
    next.push(tag);
  }
  return { list: next, full };
}

export function fromProfile(profile: Profile | undefined): ProfileValues {
  return {
    roles: profile?.target_roles ?? [],
    skills: profile?.skills ?? [],
    locations: profile?.locations ?? [],
    seniority: (profile?.seniority as Seniority | null | undefined) ?? "",
    salaryMin: profile?.salary_min == null ? "" : String(profile.salary_min),
    salaryMax: profile?.salary_max == null ? "" : String(profile.salary_max),
    currency: profile?.salary_currency ?? "",
  };
}

/** "" is no salary (null); anything else must be a whole number of 0 or more. */
function parseAmount(text: string): { value: number | null; problem?: string } {
  const clean = text.replace(/[\s,]/g, "");
  if (clean === "") return { value: null };
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return { value: null, problem: "salary_integer" };
  const n = Number(clean);
  if (n < 0) return { value: null, problem: "salary_negative" };
  if (!Number.isInteger(n)) return { value: null, problem: "salary_integer" };
  return { value: n };
}

/** The problems the form can find before asking the API. */
export function validate(values: ProfileValues): ProfileProblems {
  const problems: ProfileProblems = {};
  const min = parseAmount(values.salaryMin);
  const max = parseAmount(values.salaryMax);
  if (min.problem) problems.salaryMin = min.problem;
  if (max.problem) problems.salaryMax = max.problem;
  if (min.value !== null && max.value !== null && min.value > max.value) {
    problems.salaryMax ??= "salary_range";
  }
  const currency = values.currency.trim();
  if (currency && !/^[A-Za-z]{3}$/.test(currency)) problems.currency = "currency_invalid";
  else if (!currency && (min.value !== null || max.value !== null)) {
    problems.currency = "currency_needed";
  }
  return problems;
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/** Only the fields that changed, ready for PATCH /v1/profile. Empty when nothing changed. */
export function buildPatch(initial: ProfileValues, current: ProfileValues): ProfileUpdate {
  const patch: ProfileUpdate = {};
  if (!sameList(initial.roles, current.roles)) patch.target_roles = current.roles;
  if (!sameList(initial.skills, current.skills)) patch.skills = current.skills;
  if (!sameList(initial.locations, current.locations)) patch.locations = current.locations;
  if (initial.seniority !== current.seniority) patch.seniority = current.seniority || null;
  if (parseAmount(initial.salaryMin).value !== parseAmount(current.salaryMin).value) {
    patch.salary_min = parseAmount(current.salaryMin).value;
  }
  if (parseAmount(initial.salaryMax).value !== parseAmount(current.salaryMax).value) {
    patch.salary_max = parseAmount(current.salaryMax).value;
  }
  if (initial.currency.trim().toUpperCase() !== current.currency.trim().toUpperCase()) {
    patch.salary_currency = current.currency.trim() ? current.currency.trim().toUpperCase() : null;
  }
  return patch;
}

export const isEmptyPatch = (patch: ProfileUpdate) => Object.keys(patch).length === 0;

const FIELD_OF_API: Record<string, SalaryField> = {
  salary_min: "salaryMin",
  salary_max: "salaryMax",
  salary_currency: "currency",
};

/** Puts the API's 422 problems on the form's fields. Anything else stays for the page. */
export function problemsFromApi(error: unknown): ProfileProblems {
  if (!(error instanceof ApiError)) return {};
  const problems: ProfileProblems = {};
  if (error.code === "invalid_salary_range") problems.salaryMax = "salary_range";
  for (const { loc } of error.fieldProblems) {
    const field = FIELD_OF_API[String(loc[loc.length - 1])];
    if (field) problems[field] ??= field === "currency" ? "currency_invalid" : "salary_integer";
  }
  return problems;
}

/** The parts of a profile that help scoring, and how much each counts (they add up to 100). */
export const STRENGTH_PARTS = [
  { key: "roles", weight: 30 },
  { key: "skills", weight: 25 },
  { key: "locations", weight: 15 },
  { key: "seniority", weight: 15 },
  { key: "salary", weight: 15 },
] as const;
export type StrengthKey = (typeof STRENGTH_PARTS)[number]["key"];

/** How complete the form is, from what is typed in it (so it grows as the person adds things). */
export function profileStrength(values: ProfileValues): {
  percent: number;
  parts: { key: StrengthKey; weight: number; done: boolean }[];
} {
  const done: Record<StrengthKey, boolean> = {
    roles: values.roles.length > 0,
    skills: values.skills.length > 0,
    locations: values.locations.length > 0,
    seniority: values.seniority !== "",
    salary: values.salaryMin.trim() !== "" || values.salaryMax.trim() !== "",
  };
  const parts = STRENGTH_PARTS.map(({ key, weight }) => ({ key, weight, done: done[key] }));
  return { percent: parts.reduce((sum, p) => sum + (p.done ? p.weight : 0), 0), parts };
}
