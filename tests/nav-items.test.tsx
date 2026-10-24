import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { NAV_ITEMS, TOP_BAR_ITEMS } from "@/components/layout/nav-items";
import { TabBar } from "@/components/layout/tab-bar";
import { TopBar } from "@/components/layout/top-bar";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/feed",
  useRouter: () => ({ replace: vi.fn() }),
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));
vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("navigation", () => {
  it("the top bar shows Feed and Pipeline only; Profile and Settings live in the account menu", () => {
    expect(TOP_BAR_ITEMS.map((i) => i.key)).toEqual(["feed", "pipeline"]);
    wrap(<TopBar />);
    const nav = screen.getByRole("navigation", { name: "Main navigation", hidden: true });
    const links = within(nav).getAllByRole("link", { hidden: true });
    expect(links.map((a) => a.textContent)).toEqual(["Feed", "Pipeline"]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("the phone tab bar keeps all four, because phones have no account menu", () => {
    expect(NAV_ITEMS.map((i) => i.key)).toEqual(["feed", "pipeline", "profile", "settings"]);
    wrap(<TabBar />);
    const nav = screen.getByRole("navigation", { name: "Main navigation", hidden: true });
    expect(within(nav).getAllByRole("link", { hidden: true })).toHaveLength(4);
  });
});
