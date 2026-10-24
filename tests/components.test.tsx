import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Score } from "@/components/ui/score";
import { Status } from "@/components/ui/status";

describe("Button", () => {
  it("is type=button by default so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("renders as the child element with asChild (a link styled as a button)", () => {
    render(
      <Button asChild variant="primary">
        <a href="https://example.com/posting">Open</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("href", "https://example.com/posting");
    expect(link).toHaveClass("bg-accent");
  });
});

describe("Score", () => {
  it("shows the rounded number and the band word", () => {
    render(<Score value={81.6} label="Strong" />);
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });
});

describe("Status", () => {
  it("shows a word, not only a colored dot", () => {
    render(<Status status="interview">Interview</Status>);
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });
});

describe("Chip", () => {
  it("a matched skill has a check icon as well as its color", () => {
    const { container } = render(<Chip kind="matched">Python</Chip>);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("a missing skill has no check", () => {
    const { container } = render(<Chip kind="missing">Kubernetes</Chip>);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("ErrorPanel", () => {
  it("is announced as an alert and shows the code in small text", () => {
    render(<ErrorPanel message="Too many requests." code="rate_limited" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests.");
    expect(screen.getByText("rate_limited")).toHaveClass("text-xs");
  });
});
