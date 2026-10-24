import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  addTags,
  buildPatch,
  fromProfile,
  isEmptyPatch,
  problemsFromApi,
  splitTags,
  validate,
  type ProfileValues,
} from "@/lib/profile/values";

const empty = fromProfile(undefined);
const withValues = (patch: Partial<ProfileValues>): ProfileValues => ({ ...empty, ...patch });

describe("tags", () => {
  it("splits on commas, semicolons, Arabic commas and new lines, and cleans spaces", () => {
    expect(splitTags("  Data   engineer, SQL;Python\nGo،Rust ,, ")).toEqual([
      "Data engineer",
      "SQL",
      "Python",
      "Go",
      "Rust",
    ]);
    expect(splitTags("   ")).toEqual([]);
  });

  it("ignores a duplicate in any letter case", () => {
    expect(addTags(["Python"], "python, SQL, sql", 10).list).toEqual(["Python", "SQL"]);
  });

  it("never grows past the limit, and says so", () => {
    expect(addTags(["a", "b"], "c, d", 3)).toEqual({ list: ["a", "b", "c"], full: true });
    expect(addTags(["a"], "b", 3).full).toBe(false);
  });
});

describe("the profile form", () => {
  it("starts empty for a profile that has nothing yet", () => {
    expect(empty).toEqual({
      roles: [],
      skills: [],
      locations: [],
      seniority: "",
      salaryMin: "",
      salaryMax: "",
      currency: "",
    });
  });

  it("reads a saved profile", () => {
    const values = fromProfile({
      target_roles: ["Data engineer"],
      skills: ["SQL"],
      locations: ["Tunis"],
      seniority: "senior",
      salary_min: 3000,
      salary_max: null,
      salary_currency: "TND",
      updated_at: null,
      weights: {},
    });
    expect(values).toMatchObject({
      seniority: "senior",
      salaryMin: "3000",
      salaryMax: "",
      currency: "TND",
    });
  });

  it("accepts an empty salary and a good one", () => {
    expect(validate(empty)).toEqual({});
    expect(
      validate(withValues({ salaryMin: "3 000", salaryMax: "5000", currency: "tnd" })),
    ).toEqual({});
  });

  it("finds the salary problems before asking the API", () => {
    expect(validate(withValues({ salaryMin: "-1", currency: "TND" }))).toEqual({
      salaryMin: "salary_negative",
    });
    expect(validate(withValues({ salaryMin: "12.5", currency: "TND" }))).toEqual({
      salaryMin: "salary_integer",
    });
    expect(validate(withValues({ salaryMin: "abc", currency: "TND" }))).toEqual({
      salaryMin: "salary_integer",
    });
    expect(validate(withValues({ salaryMin: "9", salaryMax: "5", currency: "TND" }))).toEqual({
      salaryMax: "salary_range",
    });
    expect(validate(withValues({ currency: "TN" }))).toEqual({ currency: "currency_invalid" });
    expect(validate(withValues({ salaryMin: "100" }))).toEqual({ currency: "currency_needed" });
  });

  it("sends only what changed", () => {
    const base = withValues({ roles: ["A"], salaryMin: "100", currency: "TND" });
    expect(isEmptyPatch(buildPatch(base, { ...base }))).toBe(true);
    expect(buildPatch(base, { ...base, roles: ["A", "B"] })).toEqual({ target_roles: ["A", "B"] });
    expect(buildPatch(base, { ...base, seniority: "mid" })).toEqual({ seniority: "mid" });
    expect(buildPatch(base, { ...base, salaryMin: "" })).toEqual({ salary_min: null });
    expect(buildPatch(base, { ...base, currency: "eur" })).toEqual({ salary_currency: "EUR" });
    expect(buildPatch(withValues({ seniority: "mid" }), withValues({ seniority: "" }))).toEqual({
      seniority: null,
    });
  });
});

describe("the API's field problems", () => {
  it("lands on the right field", () => {
    const error = new ApiError({
      status: 422,
      code: "validation_error",
      message: "x",
      details: [{ loc: ["body", "salary_currency"], msg: "too short" }],
    });
    expect(problemsFromApi(error)).toEqual({ currency: "currency_invalid" });
    expect(
      problemsFromApi(new ApiError({ status: 422, code: "invalid_salary_range", message: "x" })),
    ).toEqual({ salaryMax: "salary_range" });
  });

  it("leaves other errors to the page", () => {
    expect(
      problemsFromApi(new ApiError({ status: 500, code: "internal_error", message: "x" })),
    ).toEqual({});
    expect(problemsFromApi(new Error("boom"))).toEqual({});
  });
});
