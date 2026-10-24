// @vitest-environment node
import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function leaves(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.values(obj).flatMap(leaves);
}

describe("messages", () => {
  const reference = keys(en).sort();

  it.each([
    ["fr", fr],
    ["ar", ar],
  ])("%s has exactly the same keys as en", (_locale, messages) => {
    expect(keys(messages).sort()).toEqual(reference);
  });

  it.each([
    ["en", en],
    ["fr", fr],
    ["ar", ar],
  ])("%s has no empty text", (_locale, messages) => {
    for (const text of leaves(messages)) expect(text.trim().length).toBeGreaterThan(0);
  });

  it("texts have no exclamation marks (calm tone)", () => {
    for (const messages of [en, fr, ar]) {
      for (const text of leaves(messages)) expect(text).not.toMatch(/[!！]/);
    }
  });
});
