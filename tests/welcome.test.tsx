import { render, screen, within } from "@testing-library/react";
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
  const m = locales[locale];

  it("has one h1 and the content in the order set by fursa web.md", () => {
    renderWelcome(locale);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual([
      m.welcome.how.title,
      m.welcome.example.title,
      m.welcome.doesNot.title,
      m.welcome.data.title,
    ]);
  });

  it("has exactly one primary button (Create account) and a secondary Sign in", () => {
    renderWelcome(locale);
    const create = screen.getByRole("link", { name: m.actions.createAccount });
    const signIn = screen.getByRole("link", { name: m.actions.signIn });
    expect(create).toHaveClass("bg-accent");
    expect(create).toHaveAttribute("href", "/signup");
    expect(signIn).not.toHaveClass("bg-accent");
    expect(signIn).toHaveAttribute("href", "/login");
    expect(document.querySelectorAll("a.bg-accent")).toHaveLength(1);
  });

  it("shows three numbered steps", () => {
    renderWelcome(locale);
    const steps = screen.getAllByRole("listitem").filter((li) => li.closest("ol"));
    expect(steps).toHaveLength(3);
    expect(steps.map((li) => within(li).getByText(/^[123]$/).textContent)).toEqual(["1", "2", "3"]);
  });

  it("labels the feed example as an example, with three rows and one selected", () => {
    renderWelcome(locale);
    const example = screen.getByRole("region", { name: m.welcome.example.label });
    expect(within(example).getAllByRole("listitem")).toHaveLength(3);
    expect(example.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(within(example).getByText(m.welcome.example.detail.byAi)).toBeInTheDocument();
  });

  it("makes no API call and has no raw HTML injection", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderWelcome(locale);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.querySelector("script")).toBeNull();
    fetchSpy.mockRestore();
  });
});
