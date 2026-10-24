import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { WelcomeContent } from "@/components/features/welcome/welcome-content";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

// The page links use next-intl's navigation, which needs the Next.js router: plain links here.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const locales = { en, fr, ar } as const;

function renderWelcome(locale: keyof typeof locales) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locales[locale]}>
      <WelcomeContent />
    </NextIntlClientProvider>,
  );
}

describe.each(["en", "fr", "ar"] as const)("welcome page (%s)", (locale) => {
  const m = locales[locale].welcome;
  const actions = locales[locale].actions;

  it("has one h1 and the sections in order", () => {
    renderWelcome(locale);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual([
      m.how.title,
      m.example.title,
      m.services.title,
      m.promise.title,
      m.data.title,
      m.faq.title,
      m.closing.title,
    ]);
  });

  it("has one primary button in the hero (Create account) and a secondary Sign in", () => {
    renderWelcome(locale);
    const hero = screen.getByRole("heading", { level: 1 }).closest("section") as HTMLElement;
    const create = within(hero).getByRole("link", { name: actions.createAccount });
    const signIn = within(hero).getByRole("link", { name: actions.signIn });
    expect(create).toHaveClass("bg-accent");
    expect(create).toHaveAttribute("href", "/signup");
    expect(signIn).not.toHaveClass("bg-accent");
    expect(signIn).toHaveAttribute("href", "/login");
    expect(hero.querySelectorAll("a.bg-accent")).toHaveLength(1);
  });

  it("shows the hero example slip with a score and its reason", () => {
    renderWelcome(locale);
    const slip = screen.getByRole("complementary", { name: m.hero.tag });
    expect(within(slip).getByText("82")).toBeInTheDocument();
    expect(within(slip).getByText(m.hero.why)).toBeInTheDocument();
  });

  it("shows how it works as three numbered steps", () => {
    const { container } = renderWelcome(locale);
    const steps = container.querySelectorAll("ol > li");
    expect(steps).toHaveLength(3);
    expect(Array.from(steps).map((li) => li.querySelector("span")?.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("shows the example list best first, labeled as an example, with a reason on each row", () => {
    renderWelcome(locale);
    const list = screen.getByRole("region", { name: m.example.label });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("82"),
      expect.stringContaining("68"),
      expect.stringContaining("51"),
    ]);
    expect(rows[0]).toHaveAttribute("aria-current", "true");
    expect(within(list).getByText(m.example.jobs.one.reason)).toBeInTheDocument();
    expect(screen.getAllByText(m.example.tag).length).toBeGreaterThan(0);
  });

  it("lists the four services and switches the sample when one is chosen", () => {
    renderWelcome(locale);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(m.services.feed.text)).toBeInTheDocument();

    fireEvent.mouseDown(tabs[2] as HTMLElement, { button: 0 });
    expect(screen.getByText(m.services.alerts.text)).toBeInTheDocument();
    expect(screen.queryByText(m.services.feed.text)).toBeNull();
    expect(screen.getByText(m.services.later)).toBeInTheDocument();
  });

  it("says plainly that Fursa never applies for the user, and shows the data promise", () => {
    renderWelcome(locale);
    const quote = screen.getAllByText(
      (_, el) => el?.tagName === "P" && el.textContent === m.promise.quote,
    );
    expect(quote).toHaveLength(1);
    expect(screen.getByText(m.data.text)).toBeInTheDocument();
  });

  it("has six questions and no pricing question", () => {
    const { container } = renderWelcome(locale);
    expect(container.querySelectorAll("details")).toHaveLength(6);
    const text = container.querySelector("#faq")?.textContent ?? "";
    expect(text).not.toMatch(/free|price|pricing|gratuit|prix|مجاني|سعر/i);
  });

  it("ends with a second Create account link and makes no API call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderWelcome(locale);
    const closing = screen.getByRole("heading", { name: m.closing.title }).closest("section");
    expect(
      within(closing as HTMLElement).getByRole("link", { name: actions.createAccount }),
    ).toHaveAttribute("href", "/signup");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
