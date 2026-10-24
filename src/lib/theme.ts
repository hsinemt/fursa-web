export const THEME_COOKIE = "fursa-theme";
export const THEMES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEMES)[number];

export function parseTheme(value: string | undefined): ThemeChoice {
  return THEMES.find((t) => t === value) ?? "system";
}
