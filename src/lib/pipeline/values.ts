import type { JobSummary } from "@/lib/feed/values";

/** Lower case with the accents removed, so "Ingénieur" matches "ingenieur". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/** Whether a card matches the search box: every word typed is in the title or the company. */
export function matchesSearch(job: Pick<JobSummary, "title" | "company">, search: string): boolean {
  const words = fold(search).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(`${job.title} ${job.company}`);
  return words.every((word) => haystack.includes(word));
}
