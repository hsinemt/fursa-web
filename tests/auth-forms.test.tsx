import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandPanel } from "@/components/features/auth/brand-panel";
import { ForgotForm } from "@/components/features/auth/forgot-form";
import { LoginForm } from "@/components/features/auth/login-form";
import { ResetForm } from "@/components/features/auth/reset-form";
import { SignupForm } from "@/components/features/auth/signup-form";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { ApiError } from "@/lib/api/errors";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

const actions = vi.hoisted(() => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
  requestPasswordResetAction: vi.fn(),
  updatePasswordAction: vi.fn(),
  signOutAction: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/lib/auth/actions", () => actions);
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/jobs/3",
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderIn(ui: React.ReactElement, locale: "en" | "ar" = "en") {
  const messages = locale === "ar" ? ar : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login form", () => {
  it("explains what is wrong and does not call the server for an invalid form", async () => {
    renderIn(<LoginForm next={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter an email address like name@example.com."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(actions.signInAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("sends the form, the language and where to go next; then goes there", async () => {
    actions.signInAction.mockResolvedValue({ ok: true, next: "/jobs/1" });
    renderIn(<LoginForm next="/jobs/1" />);
    type("Email", "a@b.co");
    type("Password", "secret-123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/jobs/1"));
    expect(actions.signInAction).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "secret-123",
      locale: "en",
      next: "/jobs/1",
    });
  });

  it("shows the server's refusal in one sentence, with an icon, and stays on the page", async () => {
    actions.signInAction.mockResolvedValue({ ok: false, error: "invalid_credentials" });
    renderIn(<LoginForm next={null} />);
    type("Email", "a@b.co");
    type("Password", "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "The email or the password is not right. Check them and try again.",
    );
    expect(alert.querySelector("svg")).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows a field problem found by the server on its field", async () => {
    actions.signInAction.mockResolvedValue({
      ok: false,
      error: "unknown",
      fieldErrors: { email: "email_invalid" },
    });
    renderIn(<LoginForm next={null} />);
    type("Email", "a@b.co");
    type("Password", "x");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter an email address like name@example.com."),
    ).toBeInTheDocument();
  });

  it("links to the password reset page", () => {
    renderIn(<LoginForm next={null} />);
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});

describe("signup form", () => {
  it("sends the current language so the API writes in it, and goes to the next page", async () => {
    actions.signUpAction.mockResolvedValue({ ok: true, next: "/check-email" });
    renderIn(<SignupForm />, "ar");
    type(ar.auth.fields.firstName, "أمل");
    type(ar.auth.fields.lastName, "بن صالح");
    type(ar.auth.fields.email, "a@b.co");
    type(ar.auth.fields.password, "12345678");
    fireEvent.click(screen.getByRole("button", { name: ar.auth.signup.submit }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/check-email"));
    expect(actions.signUpAction).toHaveBeenCalledWith({
      firstName: "أمل",
      lastName: "بن صالح",
      email: "a@b.co",
      password: "12345678",
      locale: "ar",
    });
  });

  it("asks for at least 8 characters, in the page language", async () => {
    renderIn(<SignupForm />, "ar");
    type(ar.auth.fields.firstName, "أمل");
    type(ar.auth.fields.lastName, "بن صالح");
    type(ar.auth.fields.email, "a@b.co");
    type(ar.auth.fields.password, "1234");
    fireEvent.click(screen.getByRole("button", { name: ar.auth.signup.submit }));

    expect(await screen.findByText(ar.auth.validation.password_short)).toBeInTheDocument();
    expect(actions.signUpAction).not.toHaveBeenCalled();
  });

  it("tells a person who already has an account to sign in", async () => {
    actions.signUpAction.mockResolvedValue({ ok: false, error: "email_taken" });
    renderIn(<SignupForm />);
    type("First name", "Sam");
    type("Last name", "Doe");
    type("Email", "a@b.co");
    type("Password", "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("An account with this email already exists. Sign in instead."),
    ).toBeInTheDocument();
  });
});

describe("forgot password form", () => {
  it("shows the same sentence once the server accepted, whatever the email", async () => {
    actions.requestPasswordResetAction.mockResolvedValue({ ok: true, next: null });
    renderIn(<ForgotForm />);
    type("Email", "nobody@b.co");
    fireEvent.click(screen.getByRole("button", { name: "Send the link" }));

    expect(
      await screen.findByText(
        "If an account exists for this email, a link is on its way. Check your inbox.",
      ),
    ).toBeInTheDocument();
    expect(actions.requestPasswordResetAction).toHaveBeenCalledWith({
      email: "nobody@b.co",
      locale: "en",
    });
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("says so when the server cannot send (too many requests)", async () => {
    actions.requestPasswordResetAction.mockResolvedValue({ ok: false, error: "rate_limited" });
    renderIn(<ForgotForm />);
    type("Email", "a@b.co");
    fireEvent.click(screen.getByRole("button", { name: "Send the link" }));

    expect(
      await screen.findByText("Too many attempts. Wait a moment and try again."),
    ).toBeInTheDocument();
  });
});

describe("reset password form", () => {
  it("needs the two passwords to match, and says which field is wrong", async () => {
    renderIn(<ResetForm />);
    type("New password", "12345678");
    type("Confirm the new password", "123456789");
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByText("The two passwords do not match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm the new password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(actions.updatePasswordAction).not.toHaveBeenCalled();
  });

  it("sends only the new password (never the confirmation) and goes on", async () => {
    actions.updatePasswordAction.mockResolvedValue({ ok: true, next: "/feed" });
    renderIn(<ResetForm />);
    type("New password", "12345678");
    type("Confirm the new password", "12345678");
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/feed"));
    expect(actions.updatePasswordAction).toHaveBeenCalledWith({ password: "12345678" });
  });
});

describe("useApiErrorHandler", () => {
  const apiError = (code: string, status: number) => new ApiError({ status, code, message: code });

  it.each(["missing_token", "invalid_token", "token_expired"])(
    "%s: goes to login and comes back to this page afterwards",
    async (code) => {
      const { result } = renderHook(() => useApiErrorHandler());
      expect(await result.current(apiError(code, 401))).toBe(true);
      expect(router.replace).toHaveBeenCalledWith({
        pathname: "/login",
        query: { next: "/jobs/3" },
      });
    },
  );

  it("account_deleted: signs out (the server clears both cookies and redirects)", async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    expect(await result.current(apiError("account_deleted", 403))).toBe(true);
    expect(actions.signOutAction).toHaveBeenCalledTimes(1);
  });

  it("leaves every other error to the screen", async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    expect(await result.current(apiError("job_not_found", 404))).toBe(false);
    expect(await result.current(new Error("boom"))).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
    expect(actions.signOutAction).not.toHaveBeenCalled();
  });
});

describe("password field", () => {
  it("shows and hides the password with a button that has a name and a state", () => {
    renderIn(<LoginForm next={null} />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const show = screen.getByRole("button", { name: "Show password" });
    expect(show).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(show);

    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(hide);
    expect(input).toHaveAttribute("type", "password");
  });

  it("the toggle never submits the form", () => {
    renderIn(<LoginForm next={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(actions.signInAction).not.toHaveBeenCalled();
  });

  it("is named in the page language", () => {
    renderIn(<LoginForm next={null} />, "ar");
    expect(screen.getByRole("button", { name: ar.auth.fields.showPassword })).toBeInTheDocument();
  });

  it("the reset form has a toggle on both password fields", () => {
    renderIn(<ResetForm />);
    expect(screen.getAllByRole("button", { name: "Show password" })).toHaveLength(2);
  });

  it("a form with only an email has no toggle", () => {
    renderIn(<ForgotForm />);
    expect(screen.queryByRole("button", { name: "Show password" })).toBeNull();
  });
});

describe("sign up: names", () => {
  it("starts with first name and last name, then email and password", () => {
    renderIn(<SignupForm />);
    const autocomplete = screen
      .getAllByRole("textbox")
      .map((el) => el.getAttribute("autocomplete"));
    expect(autocomplete).toEqual(["given-name", "family-name", "email"]);
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("asks for both names, in the page language, and does not call the server", async () => {
    renderIn(<SignupForm />, "ar");
    type(ar.auth.fields.email, "a@b.co");
    type(ar.auth.fields.password, "12345678");
    fireEvent.click(screen.getByRole("button", { name: ar.auth.signup.submit }));

    expect(await screen.findAllByText(ar.auth.validation.name_required)).toHaveLength(2);
    expect(actions.signUpAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ar.auth.fields.firstName)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("sign up: password rule and terms", () => {
  const rule = () => screen.getByText("At least 8 characters.").closest("p") as HTMLElement;

  it("shows the rule as waiting, then met with a check, as the person types", () => {
    renderIn(<SignupForm />);
    expect(rule().querySelector("svg")).toBeNull();

    type("Password", "1234567");
    expect(rule().querySelector("svg")).toBeNull();

    type("Password", "12345678");
    expect(rule().querySelector("svg")).not.toBeNull(); // a check, not only a color
  });

  it("links to the Terms and the Privacy policy", () => {
    renderIn(<SignupForm />);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("has the terms links in Arabic too", () => {
    renderIn(<SignupForm />, "ar");
    expect(screen.getByRole("link", { name: "الشروط" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "سياسة الخصوصية" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });
});

describe("brand panel", () => {
  it("says what Fursa does, in words only", () => {
    const { container } = renderIn(<BrandPanel />);
    const panel = screen.getByRole("complementary");

    expect(panel).toHaveTextContent("Find the jobs that fit you, and see why.");
    expect(panel).toHaveTextContent("Fursa scores each job against your profile");
    expect(panel).toHaveTextContent("Fursa never applies for you.");
    expect(panel).toHaveTextContent("Export your data or delete your account at any time.");
    expect(panel).toHaveTextContent("In Arabic, French and English.");

    // No example card or slip, no logos or photos, no social buttons: only text.
    expect(panel).not.toHaveTextContent("Example");
    expect(panel).not.toHaveTextContent(en.welcome.hero.title);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("the text block is centered in the panel, and the paragraph is justified", () => {
    renderIn(<BrandPanel />);
    const paragraph = screen.getByText(/Fursa scores each job against your profile/);
    expect(paragraph).toHaveClass("text-justify");
    // The block that holds the text is centered both ways inside the panel.
    const centered = paragraph.parentElement?.parentElement as HTMLElement;
    expect(centered).toHaveClass("flex", "items-center", "justify-center");
  });

  it("is only for laptops: hidden below the large breakpoint", () => {
    renderIn(<BrandPanel />);
    expect(screen.getByRole("complementary")).toHaveClass("hidden", "lg:flex");
  });
});
