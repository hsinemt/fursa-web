// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import { apiOrigin, buildCsp } from "@/lib/security/csp";
import { getDirection } from "@/i18n/routing";
import { parseTheme } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { scoreBand } from "@/lib/utils/score";

describe("scoreBand", () => {
  it.each([
    [100, "strong"],
    [75, "strong"],
    [74, "good"],
    [60, "good"],
    [59, "partial"],
    [45, "partial"],
  ] as const)("%i is %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for the same color", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1f4fa0", "#1f4fa0")).toBeCloseTo(1, 5);
  });

  it("matches the ratios measured in fursa design.md", () => {
    expect(contrastRatio("#1b2430", "#f7f8fa")).toBeCloseTo(14.7, 0);
    expect(contrastRatio("#ffffff", "#1f4fa0")).toBeCloseTo(7.8, 0);
  });
});

describe("getDirection", () => {
  it("is rtl for Arabic only", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("en")).toBe("ltr");
  });
});

describe("parseTheme", () => {
  it("accepts the three choices and falls back to system", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme("purple")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
  });
});

describe("cn", () => {
  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4", false, "text-ink")).toBe("px-4 text-ink");
  });
});

describe("csp", () => {
  const csp = buildCsp({ nonce: "abc", apiUrl: "https://api.fursa.app/v1", isDev: false });

  it("allows scripts only from self and the nonce, never unsafe-inline", () => {
    const script = csp.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(script).toContain("'nonce-abc'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it("allows calls to the API origin and nothing else", () => {
    expect(csp).toContain("connect-src 'self' https://api.fursa.app;");
  });

  it("forbids framing and plugins", () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("falls back to the local API for a missing or invalid URL", () => {
    expect(apiOrigin(undefined)).toBe("http://localhost:8000");
    expect(apiOrigin("not a url")).toBe("http://localhost:8000");
  });

  it("only allows eval in development", () => {
    expect(buildCsp({ nonce: "x", isDev: true })).toContain("'unsafe-eval'");
  });
});

describe("csp upgrade-insecure-requests", () => {
  it("is added only for an https site in production", () => {
    const base = { nonce: "x", isDev: false };
    expect(buildCsp({ ...base, https: true })).toContain("upgrade-insecure-requests");
    expect(buildCsp({ ...base, https: false })).not.toContain("upgrade-insecure-requests");
    expect(buildCsp({ ...base })).not.toContain("upgrade-insecure-requests");
  });
});

describe("cn with our type scale", () => {
  it("keeps a custom size next to a color", () => {
    expect(cn("text-title", "text-slate")).toBe("text-title text-slate");
    expect(cn("text-md text-ink", "text-display")).toBe("text-ink text-display");
  });
});
