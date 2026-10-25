// @vitest-environment node
import { describe, expect, it } from "vitest";
import { feedKeys } from "@/lib/feed/keys";
import {
  apiFilters,
  filterCount,
  parseParams,
  paramsQuery,
  withoutFilters,
  type FeedParams,
} from "@/lib/feed/params";

const read = (query: string) => parseParams(new URLSearchParams(query));

const plain: FeedParams = read("");

describe("parseParams", () => {
  it("is all defaults for an empty address", () => {
    expect(plain).toEqual({
      status: null,
      sort: "best",
      q: "",
      minScore: null,
      workModes: [],
      levels: [],
      types: [],
      days: null,
    });
    expect(filterCount(plain)).toBe(0);
  });

  it("reads every choice", () => {
    const params = read(
      "status=saved&sort=newest&q=data+engineer&score=70&mode=remote,hybrid&level=senior,lead&type=full_time&days=7",
    );
    expect(params).toEqual({
      status: "saved",
      sort: "newest",
      q: "data engineer",
      minScore: 70,
      workModes: ["hybrid", "remote"],
      levels: ["senior", "lead"],
      types: ["full_time"],
      days: 7,
    });
    expect(filterCount(params)).toBe(6);
  });

  it("ignores anything unknown or out of range instead of failing", () => {
    const params = read(
      "status=maybe&sort=oldest&score=500&mode=underwater,remote,remote&level=wizard&type=forever&days=0",
    );
    expect(params.status).toBeNull();
    expect(params.sort).toBe("best");
    expect(params.minScore).toBeNull();
    expect(params.workModes).toEqual(["remote"]);
    expect(params.levels).toEqual([]);
    expect(params.types).toEqual([]);
    expect(params.days).toBeNull();
    expect(read("score=abc&days=1.5&days=7").days).toBeNull();
    expect(read("days=91").days).toBeNull();
    expect(read("days=90").days).toBe(90);
  });

  it("cleans and limits the search words", () => {
    expect(read("q=%20%20data%20%20%20engineer%20").q).toBe("data engineer");
    expect(read(`q=${"x".repeat(300)}`).q).toHaveLength(100);
  });
});

describe("paramsQuery", () => {
  it("is empty when everything is at its default", () => {
    expect(paramsQuery(plain)).toBe("");
  });

  it("writes only what is set, with commas kept readable", () => {
    expect(paramsQuery({ ...plain, status: "saved" })).toBe("?status=saved");
    expect(paramsQuery({ ...plain, sort: "newest", workModes: ["remote", "hybrid"] })).toBe(
      "?sort=newest&mode=remote,hybrid",
    );
  });

  it("round-trips through the address, including awkward search text", () => {
    const params: FeedParams = {
      status: "applied",
      sort: "newest",
      q: "c++ & r&d 100%",
      minScore: 60,
      workModes: ["onsite"],
      levels: ["junior", "mid"],
      types: ["internship", "contract"],
      days: 30,
    };
    const query = paramsQuery(params);
    expect(query).not.toContain(" ");
    const again = read(query.slice(1));
    expect(again).toEqual({
      ...params,
      // the values come back in the lists' own order
      levels: ["junior", "mid"],
      types: ["contract", "internship"],
    });
  });
});

describe("filters", () => {
  const busy: FeedParams = {
    ...plain,
    status: "saved",
    sort: "newest",
    q: "devops",
    minScore: 75,
    workModes: ["remote"],
    levels: ["senior"],
    types: ["full_time"],
    days: 3,
  };

  it("withoutFilters keeps the status and the order and drops the rest", () => {
    expect(withoutFilters(busy)).toEqual({ ...plain, status: "saved", sort: "newest" });
    expect(filterCount(withoutFilters(busy))).toBe(0);
  });

  it("apiFilters sends only what is set, in the API's own parameter names", () => {
    expect(apiFilters(plain)).toEqual({
      q: undefined,
      min_score: undefined,
      work_mode: undefined,
      level: undefined,
      employment_type: undefined,
      posted_within_days: undefined,
    });
    expect(apiFilters(busy)).toEqual({
      q: "devops",
      min_score: 75,
      work_mode: ["remote"],
      level: ["senior"],
      employment_type: ["full_time"],
      posted_within_days: 3,
    });
  });
});

describe("list keys", () => {
  it("keep the plain list's key as it was, with the status second", () => {
    expect(feedKeys.list(null)).toEqual(["feed", "all"]);
    expect(feedKeys.list("saved")).toEqual(["feed", "saved"]);
    expect(feedKeys.list("saved", { sort: "best", filters: {} })).toEqual(["feed", "saved"]);
  });

  it("give a list with a sort or a filter its own key, still with the status second", () => {
    const newest = feedKeys.list("saved", { sort: "newest" });
    const remote = feedKeys.list("saved", { filters: { workModes: ["remote"] } });
    expect(newest).toHaveLength(3);
    expect(newest[1]).toBe("saved");
    expect(JSON.stringify(newest)).not.toBe(JSON.stringify(remote));
    expect(JSON.stringify(remote)).toBe(
      JSON.stringify(feedKeys.list("saved", { filters: { workModes: ["remote"] } })),
    );
  });
});
