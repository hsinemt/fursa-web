import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});

/** Arabic reads from the right (rtl); French and English from the left (ltr). */
export function getDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
