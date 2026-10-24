// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/design/contrast";
import { CONTRAST_PAIRS, isHex, parseTokens, readTokensCss, type Theme } from "@/lib/design/tokens";

const { light, dark, systemDark } = parseTokens(readTokensCss());
const themes: Record<Theme, Record<string, string>> = { light, dark };

describe("design tokens: contrast (fursa design.md)", () => {
  for (const theme of ["light", "dark"] as const) {
    describe(theme, () => {
      for (const pair of CONTRAST_PAIRS) {
        it(`${pair.fg} on ${pair.bg} >= ${pair.min}:1 (${pair.use})`, () => {
          const fg = themes[theme][pair.fg];
          const bg = themes[theme][pair.bg];
          expect(isHex(fg), `--${pair.fg} must be a #rrggbb color`).toBe(true);
          expect(isHex(bg), `--${pair.bg} must be a #rrggbb color`).toBe(true);
          const ratio = contrastRatio(fg as string, bg as string);
          expect(
            ratio,
            `${theme}: --${pair.fg} (${fg}) on --${pair.bg} (${bg}) is ${ratio.toFixed(2)}:1, needs ${pair.min}:1`,
          ).toBeGreaterThanOrEqual(pair.min);
        });
      }
    });
  }

  it("dark mode uses a dark --on-accent (white on the dark blue fails)", () => {
    const ratio = contrastRatio("#ffffff", dark["accent"] as string);
    expect(ratio).toBeLessThan(3);
    expect(contrastRatio(dark["on-accent"] as string, dark["accent"] as string)).toBeGreaterThan(
      4.5,
    );
  });
});

describe("design tokens: structure", () => {
  it("light and dark define exactly the same tokens", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("the system-dark block repeats the dark values exactly", () => {
    expect(systemDark).toEqual(dark);
  });

  it("every color token is a #rrggbb value", () => {
    for (const [name, value] of Object.entries(light)) {
      if (name.startsWith("shadow")) continue;
      expect(isHex(value), `light --${name}`).toBe(true);
      expect(isHex(dark[name]), `dark --${name}`).toBe(true);
    }
  });

  it("matches the values written in fursa design.md", () => {
    expect(light["accent"]).toBe("#1f4fa0");
    expect(dark["accent"]).toBe("#6aa2f0");
    expect(dark["on-accent"]).toBe("#0e1621");
    expect(light["control"]).toBe("#858fa0");
  });
});
