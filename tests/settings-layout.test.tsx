import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsCard } from "@/components/features/settings/settings-card";
import { SettingsRail } from "@/components/features/settings/settings-rail";

const items = [
  { id: "language", label: "Language" },
  { id: "alerts", label: "Alerts" },
  { id: "account", label: "Account" },
] as const;

describe("settings layout", () => {
  it("gives each card an anchor, an icon, a title and its help", () => {
    const { container } = render(
      <SettingsCard id="alerts" title="Alerts" help="How Fursa tells you.">
        <p>controls</p>
      </SettingsCard>,
    );
    const card = container.querySelector("#settings-alerts")!;
    expect(
      within(card as HTMLElement).getByRole("heading", { name: "Alerts" }),
    ).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("How Fursa tells you.")).toBeInTheDocument();
    expect(card.querySelector("svg")).not.toBeNull();
    expect(within(card as HTMLElement).getByText("controls")).toBeInTheDocument();
  });

  it("lists the groups as links to their cards and marks the current one", () => {
    render(<SettingsRail label="Settings sections" items={[...items]} />);
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#settings-language",
      "#settings-alerts",
      "#settings-account",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "true");
    expect(links[1]).not.toHaveAttribute("aria-current");

    fireEvent.click(links[2]!);
    expect(links[2]).toHaveAttribute("aria-current", "true");
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("is hidden below laptop width (the cards follow each other on small screens)", () => {
    render(<SettingsRail label="Settings sections" items={[...items]} />);
    const nav = screen.getByRole("navigation", { hidden: true, name: "Settings sections" });
    expect(nav.className).toContain("hidden");
    expect(nav.className).toContain("lg:block");
  });
});
