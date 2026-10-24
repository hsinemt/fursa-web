export type ScoreBand = "strong" | "good" | "partial";

/**
 * Word band for a match score (see "Score" in fursa design.md).
 * Strong from 75, Good 60 to 74, Partial 45 to 59. Matches under 45 are not stored,
 * but a lower number still gets "partial" so the UI never shows an empty word.
 */
export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return "strong";
  if (score >= 60) return "good";
  return "partial";
}
