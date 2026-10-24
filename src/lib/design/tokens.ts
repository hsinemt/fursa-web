import { readFileSync } from "node:fs";
import path from "node:path";

export type Theme = "light" | "dark";
export type TokenMap = Record<string, string>;

/** Pairs of tokens that are used together, and the minimum ratio each must reach. */
export type ContrastPair = {
  fg: string;
  bg: string;
  min: 4.5 | 3;
  use: string;
};

/**
 * Every foreground/background combination the interface uses.
 * Text needs 4.5:1, parts of the interface (control borders, focus ring, status dots) 3:1.
 * Add a pair here when a new combination is introduced.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  // Text
  { fg: "ink", bg: "page", min: 4.5, use: "Main text on page" },
  { fg: "ink", bg: "panel", min: 4.5, use: "Main text on panel" },
  { fg: "ink", bg: "tint", min: 4.5, use: "Text on selected row" },
  { fg: "slate", bg: "page", min: 4.5, use: "Secondary text on page" },
  { fg: "slate", bg: "panel", min: 4.5, use: "Secondary text on panel" },
  { fg: "slate", bg: "tint", min: 4.5, use: "Secondary text on selected row" },
  { fg: "on-accent", bg: "accent", min: 4.5, use: "Primary button text" },
  { fg: "on-accent", bg: "accent-hover", min: 4.5, use: "Primary button text, hover" },
  { fg: "on-accent", bg: "accent-press", min: 4.5, use: "Primary button text, pressed" },
  { fg: "accent", bg: "page", min: 4.5, use: "Link on page" },
  { fg: "accent", bg: "panel", min: 4.5, use: "Link or score on panel" },
  { fg: "accent", bg: "tint", min: 4.5, use: "Matched chip, selected row" },
  { fg: "accent-hover", bg: "panel", min: 4.5, use: "Link, hover" },
  { fg: "accent-press", bg: "panel", min: 4.5, use: "Link, pressed" },
  { fg: "success", bg: "success-bg", min: 4.5, use: "Success text" },
  { fg: "danger", bg: "danger-bg", min: 4.5, use: "Error text on error panel" },
  { fg: "danger", bg: "panel", min: 4.5, use: "Field error, destructive button" },
  { fg: "warning", bg: "warning-bg", min: 4.5, use: "Warning text" },
  {
    fg: "on-accent",
    bg: "danger",
    min: 4.5,
    use: "Filled danger button text (confirmation dialogs)",
  },
  // Parts of the interface
  { fg: "control", bg: "panel", min: 3, use: "Input and button border" },
  { fg: "control", bg: "page", min: 3, use: "Input and button border on page" },
  { fg: "focus", bg: "page", min: 3, use: "Focus ring on page" },
  { fg: "focus", bg: "panel", min: 3, use: "Focus ring on panel" },
  { fg: "accent", bg: "panel", min: 3, use: "Status dot: New" },
  { fg: "slate", bg: "panel", min: 3, use: "Status dot: Saved" },
  { fg: "ink", bg: "panel", min: 3, use: "Status dot: Applied" },
  { fg: "status-interview", bg: "panel", min: 3, use: "Status dot: Interview" },
  { fg: "success", bg: "panel", min: 3, use: "Status dot: Offer" },
  { fg: "status-rejected", bg: "panel", min: 3, use: "Status dot: Rejected" },
];

const TOKENS_FILE = path.join(process.cwd(), "src", "styles", "tokens.css");

export function readTokensCss(file: string = TOKENS_FILE): string {
  return readFileSync(file, "utf8");
}

/** Returns the body of the first rule whose selector matches `selector` exactly. */
function ruleBody(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  return match?.[1] ?? null;
}

function parseDeclarations(body: string): TokenMap {
  const out: TokenMap = {};
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const name = m[1];
    const value = m[2];
    if (name && value) out[name] = value.trim();
  }
  return out;
}

/** Tokens for each theme, plus the copy used when data-theme="system" and the OS is dark. */
export function parseTokens(css: string): {
  light: TokenMap;
  dark: TokenMap;
  systemDark: TokenMap;
} {
  const light = ruleBody(css, '[data-theme="light"]');
  const dark = ruleBody(css, '[data-theme="dark"]');
  const system = ruleBody(css, ':root[data-theme="system"]');
  if (!light || !dark || !system) {
    throw new Error("tokens.css must define light, dark and system-dark blocks");
  }
  return {
    light: parseDeclarations(light),
    dark: parseDeclarations(dark),
    systemDark: parseDeclarations(system),
  };
}

export function isHex(value: string | undefined): value is string {
  return value !== undefined && /^#[0-9a-f]{6}$/i.test(value);
}
