import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Serif } from "next/font/google";

// Interface text (English, French). Two weights only: 400 and 500.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-sans",
});

// Interface text and headings in Arabic.
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-arabic",
});

// Headings, scores and the wordmark (Latin only).
export const plexSerif = IBM_Plex_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  display: "swap",
  variable: "--font-plex-serif",
});

export const fontVariables = [plexSans.variable, plexArabic.variable, plexSerif.variable].join(" ");
