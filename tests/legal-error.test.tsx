import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/[locale]/error";
import { LegalPage } from "@/components/layout/legal-page";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const all = { en, fr, ar } as const;

function renderIn(locale: keyof typeof all, ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale={locale} messages={all[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.unstubAllEnvs());

describe.each(["en", "fr", "ar"] as const)("legal pages in %s", (locale) => {
  it.each(["privacy", "terms"] as const)("the %s page shows every section as a heading", (kind) => {
    renderIn(locale, <LegalPage kind={kind} />);
    const messages = all[locale].legal[kind];
    expect(screen.getByRole("heading", { level: 1, name: messages.title })).toBeInTheDocument();
    for (const section of messages.sections) {
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(screen.getByText(all[locale].legal.draft)).toBeInTheDocument();
    expect(screen.getByText(all[locale].legal.updated)).toBeInTheDocument();
  });

  it("text and lists both come out, with no raw markup", () => {
    const { container } = renderIn(locale, <LegalPage kind="privacy" />);
    expect(container.querySelectorAll("ul li").length).toBeGreaterThan(3);
    expect(container.querySelectorAll("section p").length).toBeGreaterThan(3);
    expect(container.innerHTML).not.toMatch(/<script|undefined|\[object/);
  });
});

describe("legal pages: facts that must stay true", () => {
  it("say that Fursa never applies for the person, in all three languages", () => {
    expect(JSON.stringify(en.legal.terms)).toMatch(/never applies for you/);
    expect(JSON.stringify(fr.legal.terms)).toMatch(/ne postule jamais/);
    expect(JSON.stringify(ar.legal.terms)).toMatch(/لا تقدّم فرصة على الوظائف/);
  });

  it("show a contact line only when an address is set", () => {
    const first = renderIn("en", <LegalPage kind="terms" />);
    expect(screen.queryByRole("heading", { name: "Contact" })).not.toBeInTheDocument();
    first.unmount();

    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "hello@fursa.example");
    renderIn("en", <LegalPage kind="terms" />);
    const contact = screen.getByRole("heading", { name: "Contact" }).closest("section")!;
    const link = within(contact).getByRole("link", { name: "hello@fursa.example" });
    expect(link).toHaveAttribute("href", "mailto:hello@fursa.example");
    expect(link).toHaveAttribute("dir", "ltr");
  });
});

describe("error page", () => {
  it("says what happened calmly, offers to try again and a way out", () => {
    const reset = vi.fn();
    renderIn(
      "en",
      <ErrorPage
        error={Object.assign(new Error("secret detail"), { digest: "abc123" })}
        reset={reset}
      />,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Back to the feed" })).toHaveAttribute("href", "/feed");
    // The id is shown for support; the error's own text never is.
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
  });

  it("works in Arabic", () => {
    renderIn("ar", <ErrorPage error={new Error("x")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "حدثت مشكلة." })).toBeInTheDocument();
  });
});
