import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineCard } from "@/components/features/welcome/pipeline-card";

const steps = [
  { key: "a", label: "Step A", time: "08:01" },
  { key: "b", label: "Step B", time: "08:02" },
  { key: "c", label: "Step C", time: "08:03" },
];

function renderCard() {
  return render(
    <PipelineCard
      label="Pipeline"
      tag="Example"
      title="Job"
      company="Company"
      steps={steps}
      workingLabel="Working"
      doneLabel="Done"
      resultText="Alert sent"
      score={82}
      scoreLabel="Strong"
      replayLabel="Replay"
    />,
  );
}

function stubBrowser({ reducedMotion }: { reducedMotion: boolean }) {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} }),
  );
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

/** What each row shows: its state is read from aria-current and the time's visibility. */
function states() {
  const card = screen.getByRole("region", { name: "Pipeline" });
  return within(card)
    .getAllByRole("listitem")
    .map((li) => {
      if (li.getAttribute("aria-current") === "step") return "running";
      return li.querySelector("time")?.className.includes("opacity-100") ? "done" : "waiting";
    });
}

describe("PipelineCard sequence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows everything done, with the result, when reduced motion is on", () => {
    stubBrowser({ reducedMotion: true });
    renderCard();
    expect(states()).toEqual(["done", "done", "done"]);
    expect(screen.getByText("Alert sent")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Replay" })).toBeNull();
  });

  it("runs the steps one after another, then shows the result", () => {
    stubBrowser({ reducedMotion: false });
    renderCard();

    // Just started: the first step is running, the rest wait, the card says it is working.
    expect(states()).toEqual(["running", "waiting", "waiting"]);
    expect(screen.getByText("Working")).toBeInTheDocument();
    expect(screen.queryByText("Alert sent")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(states()).toEqual(["done", "running", "waiting"]);

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(states()).toEqual(["done", "done", "running"]);

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(states()).toEqual(["done", "done", "done"]);
    expect(screen.queryByText("Working")).toBeNull();
    expect(screen.getByText("Alert sent")).toBeInTheDocument();
  });

  it("offers Replay, disabled while it runs, and plays again", () => {
    stubBrowser({ reducedMotion: false });
    renderCard();
    const replay = screen.getByRole("button", { name: "Replay" });
    expect(replay).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(replay).toBeEnabled();

    act(() => {
      replay.click();
    });
    expect(states()).toEqual(["running", "waiting", "waiting"]);
    expect(replay).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(states()).toEqual(["done", "done", "done"]);
  });
});
