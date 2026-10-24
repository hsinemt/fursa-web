// @vitest-environment node
import type { InfiniteData } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  flattenPages,
  formatSalary,
  htmlToText,
  missingSkills,
  paragraphs,
  parseFilter,
  readBreakdown,
  readFacts,
  safeHttpUrl,
  setStatusInPages,
  timeAgo,
  type FeedPage,
  type JobSummary,
} from "@/lib/feed/values";

const job = (id: string, extra: Partial<JobSummary> = {}): JobSummary => ({
  job_id: id,
  score: 80,
  status: "new",
  explanation: null,
  title: "Data engineer",
  company: "Acme",
  location: null,
  country: null,
  remote: null,
  url: "https://example.com/1",
  source: "test",
  posted_at: null,
  is_active: true,
  updated_at: "2026-10-01T00:00:00Z",
  ...extra,
});

describe("parseFilter", () => {
  it("accepts the five statuses and treats everything else as all", () => {
    expect(parseFilter("saved")).toBe("saved");
    expect(parseFilter("interview")).toBe("interview");
    expect(parseFilter("offer")).toBeNull();
    expect(parseFilter("")).toBeNull();
    expect(parseFilter(null)).toBeNull();
  });
});

describe("htmlToText", () => {
  it("drops tags and keeps paragraph and line breaks", () => {
    const text = htmlToText("<p>One</p><p>Two<br>three</p><ul><li>a</li><li>b</li></ul>");
    expect(text).toBe("One\n\nTwo\nthree\n\n- a\n\n- b");
    expect(paragraphs(text)).toEqual(["One", "Two\nthree", "- a", "- b"]);
  });

  it("removes script, style and iframe with their content, and comments", () => {
    const text = htmlToText(
      'Hello<script>alert(1)</script><style>p{}</style><iframe src="x">bad</iframe><!-- hidden -->World',
    );
    expect(text).toBe("HelloWorld");
  });

  it("keeps encoded markup as harmless text and decodes entities once", () => {
    expect(htmlToText("R&amp;D &lt;b&gt;x&lt;/b&gt; &#233;t &#x1F600; &eacute;")).toBe(
      "R&D <b>x</b> ét 😀 &eacute;",
    );
  });

  it("leaves a lone less-than sign alone", () => {
    expect(htmlToText("5 < 6 and 7 > 3")).toBe("5 < 6 and 7 > 3");
  });

  it("removes control and direction-override characters", () => {
    expect(htmlToText("a\u0000b‮c⁦d")).toBe("abcd");
  });

  it("copes with empty input and tags that never close", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText("<script>never closed")).toBe("never closed");
  });
});

describe("safeHttpUrl", () => {
  it("only lets http and https through", () => {
    expect(safeHttpUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<b>x</b>")).toBeNull();
    expect(safeHttpUrl("//evil.com")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  it("says how long ago in the person's language", () => {
    expect(timeAgo("2026-10-21T12:00:00Z", now, "en")).toBe("3 days ago");
    expect(timeAgo("2026-10-24T09:00:00Z", now, "en")).toBe("3 hours ago");
    expect(timeAgo("2026-10-21T12:00:00Z", now, "fr")).toBe("il y a 3 jours");
  });
  it("uses Western digits in Arabic", () => {
    expect(timeAgo("2026-10-21T12:00:00Z", now, "ar")).toMatch(/3/);
    expect(timeAgo("2026-10-21T12:00:00Z", now, "ar")).not.toMatch(/[٠-٩]/);
  });
  it("is empty for a missing or invalid date", () => {
    expect(timeAgo(null, now, "en")).toBe("");
    expect(timeAgo("nonsense", now, "en")).toBe("");
  });
});

describe("readFacts", () => {
  it("reads the known facts and checks each value", () => {
    const facts = readFacts({
      remote: null,
      breakdown: { job_level: "mid" },
      extracted: {
        remote_type: "hybrid",
        employment_type: "full_time",
        seniority: "senior",
        salary: { min: 50000, max: 70000, currency: "eur", period: "year" },
        tech_stack: ["Python", " SQL ", 3, ""],
        languages: ["en", "fr"],
        visa_sponsorship: "yes",
        relocation_support: "unknown",
      },
    });
    expect(facts).toEqual({
      level: "senior",
      workMode: "hybrid",
      employmentType: "full_time",
      salary: { min: 50000, max: 70000, currency: "EUR", period: "year" },
      techStack: ["Python", "SQL"],
      languages: ["en", "fr"],
      visa: true,
      relocation: null,
    });
  });

  it("leaves unknown or malformed values out", () => {
    const facts = readFacts({
      remote: true,
      breakdown: null,
      extracted: { remote_type: "unknown", seniority: "wizard", salary: { min: -1, max: "x" } },
    });
    expect(facts.workMode).toBe("remote");
    expect(facts.level).toBeNull();
    expect(facts.salary).toBeNull();
    expect(readFacts({ remote: null, breakdown: null, extracted: null }).techStack).toEqual([]);
  });

  it("falls back to the level seen in the breakdown", () => {
    expect(readFacts({ remote: null, extracted: {}, breakdown: { job_level: "lead" } }).level).toBe(
      "lead",
    );
  });
});

describe("formatSalary", () => {
  it("formats a range or a single amount with Western digits", () => {
    const base = { currency: "EUR", period: null } as const;
    expect(formatSalary({ ...base, min: 50000, max: 70000 }, "en")).toBe("50,000 – 70,000 EUR");
    expect(formatSalary({ ...base, min: 50000, max: null }, "en")).toBe("50,000 EUR");
    expect(formatSalary({ min: null, max: 900, currency: null, period: null }, "ar")).toBe("900");
  });
});

describe("readBreakdown", () => {
  it("lists the used parts in order as 0 to 100 and the matched skills", () => {
    const result = readBreakdown({
      components: { recency: 0.5, title: 0.876, skills: null, location: 1, bogus: 1, seniority: 2 },
      matched_skills: ["Python", 7],
    });
    expect(result.parts).toEqual([
      { key: "title", value: 88 },
      { key: "location", value: 100 },
      { key: "seniority", value: 100 },
      { key: "recency", value: 50 },
    ]);
    expect(result.matchedSkills).toEqual(["Python"]);
  });
  it("copes with anything", () => {
    expect(readBreakdown(null)).toEqual({ parts: [], matchedSkills: [] });
    expect(readBreakdown({ components: "x" })).toEqual({ parts: [], matchedSkills: [] });
  });
});

describe("missingSkills", () => {
  it("is the posting's skills the match did not contain, ignoring letter case", () => {
    expect(missingSkills(["Python", "Docker", "SQL"], ["python", "sql"])).toEqual(["Docker"]);
  });
});

describe("feed pages", () => {
  const pages = (): InfiniteData<FeedPage, unknown> => ({
    pageParams: [null, "c1"],
    pages: [
      { items: [job("a"), job("b")], next_cursor: "c1" },
      { items: [job("b"), job("c")], next_cursor: null },
    ],
  });

  it("flattens the pages and keeps a job that appears twice once", () => {
    expect(flattenPages(pages()).map((j) => j.job_id)).toEqual(["a", "b", "c"]);
    expect(flattenPages(undefined)).toEqual([]);
  });

  it("changes the status of one job in every page, and nothing else", () => {
    const before = pages();
    const after = setStatusInPages(before, "b", "saved");
    expect(after?.pages[0]?.items.map((j) => j.status)).toEqual(["new", "saved"]);
    expect(after?.pages[1]?.items.map((j) => j.status)).toEqual(["saved", "new"]);
    expect(before.pages[0]?.items[1]?.status).toBe("new");
  });

  it("returns the same object when nothing changes", () => {
    const before = pages();
    expect(setStatusInPages(before, "zzz", "saved")).toBe(before);
    expect(setStatusInPages(before, "a", "new")).toBe(before);
    expect(setStatusInPages(undefined, "a", "saved")).toBeUndefined();
  });
});

describe("navigation", () => {
  it("counts a job as part of the feed", async () => {
    const { isCurrentNav } = await import("@/components/layout/nav-items");
    expect(isCurrentNav("/feed", "/feed")).toBe(true);
    expect(isCurrentNav("/feed", "/jobs/abc")).toBe(true);
    expect(isCurrentNav("/profile", "/jobs/abc")).toBe(false);
    expect(isCurrentNav("/feed", "/feedback")).toBe(false);
  });
});
