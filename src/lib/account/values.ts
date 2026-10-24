/** The word the person types to confirm deleting the account (Latin letters in every language). */
export const DELETE_WORD = "DELETE";

/** Whether the typed text confirms the deletion: the word, ignoring case and surrounding spaces. */
export function confirmsDeletion(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_WORD;
}

/** `fursa-data-2026-10-24.json` */
export function exportFileName(now: Date): string {
  return `fursa-data-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Saves data as a JSON file through the browser (a temporary link with `download`), then lets
 * the browser forget it. The data is never put on the page or kept anywhere.
 */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
