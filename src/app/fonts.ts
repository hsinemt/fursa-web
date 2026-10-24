import { DM_Serif_Display, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";

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

// Headings, scores and the wordmark (Latin only). One weight: 400.
export const dmSerif = DM_Serif_Display({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--font-dm-serif",
});

export const fontVariables = [plexSans.variable, plexArabic.variable, dmSerif.variable].join(" ");
