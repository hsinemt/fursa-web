// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildPreferencesPatch,
  fromPreferences,
  parseScore,
  safeTelegramUrl,
} from "@/lib/notifications/values";

const prefs = {
  email_enabled: false,
  telegram_enabled: false,
  telegram_linked: false,
  frequency: "daily" as const,
  min_score: 70.4,
  digest_hour_utc: 7,
  email_unsubscribed_at: null,
};

describe("parseScore", () => {
  it("accepts whole numbers 0 to 100 only", () => {
    expect(parseScore("0")).toBe(0);
    expect(parseScore(" 85 ")).toBe(85);
    expect(parseScore("100")).toBe(100);
    expect(parseScore("101")).toBeNull();
    expect(parseScore("7.5")).toBeNull();
    expect(parseScore("-1")).toBeNull();
    expect(parseScore("")).toBeNull();
    expect(parseScore("abc")).toBeNull();
  });
});

describe("buildPreferencesPatch", () => {
  const base = fromPreferences(prefs);

  it("starts from the saved preferences, with the score rounded", () => {
    expect(base).toEqual({
      email_enabled: false,
      frequency: "daily",
      digest_hour_utc: 7,
      score: "70",
    });
  });

  it("is empty when nothing changed", () => {
    expect(buildPreferencesPatch(base, { ...base })).toEqual({});
  });

  it("holds only the fields that changed", () => {
    expect(buildPreferencesPatch(base, { ...base, email_enabled: true })).toEqual({
      email_enabled: true,
    });
    expect(
      buildPreferencesPatch(base, {
        ...base,
        frequency: "instant",
        digest_hour_utc: 9,
        score: "80",
      }),
    ).toEqual({ frequency: "instant", digest_hour_utc: 9, min_score: 80 });
  });

  it("leaves an invalid score out", () => {
    expect(buildPreferencesPatch(base, { ...base, score: "abc" })).toEqual({});
  });
});

describe("safeTelegramUrl", () => {
  it("accepts https on t.me and telegram.me only", () => {
    expect(safeTelegramUrl("https://t.me/FursaBot?start=abc")).toBe(
      "https://t.me/FursaBot?start=abc",
    );
    expect(safeTelegramUrl("https://telegram.me/x")).toBe("https://telegram.me/x");
    expect(safeTelegramUrl("http://t.me/x")).toBeNull();
    expect(safeTelegramUrl("https://t.me.evil.com/x")).toBeNull();
    expect(safeTelegramUrl("https://evil.example/t.me")).toBeNull();
    expect(safeTelegramUrl("javascript:alert(1)")).toBeNull();
    expect(safeTelegramUrl(null)).toBeNull();
  });
});
