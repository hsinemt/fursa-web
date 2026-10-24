// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Source-level rules from "fursa web.md" and "fursa design.md" that are cheap to enforce. */

const SRC = path.join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((file) => ({
  name: path.relative(process.cwd(), file).replaceAll("\\", "/"),
  text: readFileSync(file, "utf8"),
}));

function offenders(pattern: RegExp, skip: (name: string) => boolean = () => false): string[] {
  return files
    .filter((f) => !skip(f.name))
    .flatMap((f) =>
      f.text
        .split("\n")
        .map((line, i) => ({ line, at: `${f.name}:${i + 1}` }))
        .filter(({ line }) => pattern.test(line))
        .map(({ at, line }) => `${at}  ${line.trim()}`),
    );
}

describe("guardrails", () => {
  it("uses logical properties only (no ml-, mr-, pl-, pr-, left-, right-, text-left, text-right)", () => {
    const physical =
      /(?<![\w-])(?:-?m[lr]|p[lr]|left|right|rounded-[lr]|border-[lr]|text-(?:left|right))-/;
    expect(offenders(physical, (n) => n.endsWith(".css"))).toEqual([]);
  });

  it("has no side borders: no accent bar or line on the start or end edge of anything", () => {
    // border-s, border-e, border-l, border-r (with or without a size or color). Top and
    // bottom hairlines (border-t, border-b) are fine. See "No side lines" in fursa design.md.
    const side = /(?<![\w-])border-[selr](?![a-z])/;
    expect(offenders(side, (n) => n.endsWith(".css"))).toEqual([]);
  });

  it("has no raw hex colors outside tokens.css", () => {
    expect(
      offenders(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/, (n) => n.endsWith("tokens.css")),
    ).toEqual([]);
  });

  it("has no bold, italics, all-caps or tracking classes", () => {
    expect(
      offenders(/["'\s`](?:font-(?:bold|semibold|extrabold|black)|italic|uppercase|tracking-)/),
    ).toEqual([]);
  });

  it("has no gradients or blur", () => {
    expect(
      offenders(/(?:bg-gradient|linear-gradient|radial-gradient|backdrop-blur|blur-)/),
    ).toEqual([]);
  });

  it("never injects raw HTML", () => {
    expect(offenders(/dangerouslySetInnerHTML/)).toEqual([]);
  });

  it("never stores anything in localStorage or sessionStorage", () => {
    expect(offenders(/(?:localStorage|sessionStorage)/)).toEqual([]);
  });
});
