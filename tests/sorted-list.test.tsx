import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SortedList, type SortedJob } from "@/components/features/welcome/sorted-list";

const jobs: SortedJob[] = [
  { id: "one", title: "Alpha", meta: "m", reason: "r", score: 82, scoreLabel: "Strong" },
  { id: "two", title: "Bravo", meta: "m", reason: "r", score: 68, scoreLabel: "Good" },
  { id: "three", title: "Charlie", meta: "m", reason: "r", score: 51, scoreLabel: "Partial" },
];

function stubBrowser({ reducedMotion }: { reducedMotion: boolean }) {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }),
  );
  // Every observer reports "visible" as soon as it starts observing.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as never,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

function rows() {
  const list = screen.getByRole("region", { name: "List" });
  return within(list)
    .getAllByRole("listitem")
    .map((li) => ({
      title: li.querySelector("p")?.textContent,
      score: li.querySelector("[data-slot=score]")?.textContent?.replace(/\s+/g, ""),
      selected: li.getAttribute("aria-current") === "true",
    }));
}

describe("SortedList sequence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the final state at once when reduced motion is on", () => {
    stubBrowser({ reducedMotion: true });
    render(<SortedList jobs={jobs} label="List" replayLabel="Replay" />);
    expect(rows().map((r) => r.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(rows()[0]).toMatchObject({ score: "82Strong", selected: true });
    expect(screen.queryByRole("button", { name: "Replay" })).toBeNull();
  });

  it("goes from mixed order with no scores, to counting, to best first", () => {
    stubBrowser({ reducedMotion: false });
    render(<SortedList jobs={jobs} label="List" replayLabel="Replay" />);

    // Start: mixed order, no scores, nothing selected.
    expect(rows().map((r) => r.title)).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(rows().map((r) => r.score)).toEqual(["—", "—", "—"]);
    expect(rows().some((r) => r.selected)).toBe(false);

    // Scoring: numbers are counting, order is still mixed.
    act(() => {
      vi.advanceTimersByTime(350 + 300);
    });
    const counting = rows();
    expect(counting.map((r) => r.title)).toEqual(["Charlie", "Alpha", "Bravo"]);
    expect(counting.every((r) => r.score !== "—")).toBe(true);
    expect(counting.every((r) => !r.score?.includes("Strong"))).toBe(true);

    // Done: best first, final scores and words, the top row selected.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(rows()).toEqual([
      { title: "Alpha", score: "82Strong", selected: true },
      { title: "Bravo", score: "68Good", selected: false },
      { title: "Charlie", score: "51Partial", selected: false },
    ]);
  });

  it("offers Replay once it has run, and plays the sequence again", () => {
    stubBrowser({ reducedMotion: false });
    render(<SortedList jobs={jobs} label="List" replayLabel="Replay" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const replay = screen.getByRole("button", { name: "Replay" });
    expect(replay).toBeEnabled();

    act(() => {
      replay.click();
    });
    expect(rows().map((r) => r.score)).toEqual(["—", "—", "—"]);
    expect(replay).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(rows()[0]).toMatchObject({ title: "Alpha", score: "82Strong", selected: true });
  });
});
