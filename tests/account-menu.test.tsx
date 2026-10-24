import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu, emailInitial } from "@/components/layout/account-menu";
import * as actions from "@/lib/auth/actions";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const theme = vi.hoisted(() => ({ setTheme: vi.fn() }));
vi.mock("@/app/actions/theme", () => theme);
vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

beforeEach(() => vi.clearAllMocks());

function renderMenu(locale: "en" | "ar" = "en", current: "light" | "dark" | "system" = "system") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AccountMenu email="hsine@example.com" theme={current} />
    </NextIntlClientProvider>,
  );
}

/** Radix opens the menu on Enter or Space (the keyboard path), which jsdom handles. */
function open(name = "Account menu") {
  const trigger = screen.getByRole("button", { name });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

describe("emailInitial", () => {
  it("is the first letter in capitals, or a question mark", () => {
    expect(emailInitial("hsine@example.com")).toBe("H");
    expect(emailInitial("  élodie@x.fr")).toBe("É");
    expect(emailInitial("")).toBe("?");
    expect(emailInitial(null)).toBe("?");
  });
});

describe("account menu", () => {
  it("is an avatar with the first letter, and the menu is closed until it is opened", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Account menu" });
    expect(trigger).toHaveTextContent("H");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("holds the email, Profile, Settings, Appearance and Sign out, in that order", async () => {
    renderMenu();
    const menu = await open();
    expect(within(menu).getByText("hsine@example.com")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(within(menu).getByText("Appearance")).toBeInTheDocument();
    const order = Array.from(menu.querySelectorAll("[role^=menuitem]")).map((el) => el.textContent);
    expect(order).toEqual(["Profile", "Settings", "Light", "Dark", "System", "Sign out"]);
  });

  it("marks the current appearance", async () => {
    renderMenu("en", "dark");
    const menu = await open();
    expect(within(menu).getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(menu).getByRole("menuitemradio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("saves the appearance choice", async () => {
    renderMenu("en", "light");
    const menu = await open();
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: "Dark" }));
    expect(theme.setTheme).toHaveBeenCalledTimes(1);
    const data = theme.setTheme.mock.calls[0]![0] as FormData;
    expect(data.get("theme")).toBe("dark");
  });

  it("signs out", async () => {
    renderMenu();
    const menu = await open();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    expect(actions.signOutAction).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape and gives the focus back to the avatar", async () => {
    renderMenu();
    const menu = await open();
    fireEvent.keyDown(menu, { key: "Escape" });
    await vi.waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus(),
    );
  });

  it("works in Arabic: translated, and the menu is right to left", async () => {
    renderMenu("ar");
    const menu = await open("قائمة الحساب");
    expect(within(menu).getByRole("menuitem", { name: "الملف الشخصي" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "تسجيل الخروج" })).toBeInTheDocument();
    expect(menu).toHaveAttribute("dir", "rtl");
    // The email stays left to right.
    expect(within(menu).getByText("hsine@example.com")).toHaveAttribute("dir", "ltr");
  });
});
