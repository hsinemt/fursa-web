import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "@/components/features/onboarding/wizard";
import { FeedNudge } from "@/components/features/profile/feed-nudge";
import { ProfileScreen } from "@/components/features/profile/profile-screen";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppProviders, shouldRetry } from "@/components/providers/app-providers";
import { TagInput } from "@/components/ui/tag-input";
import { TOAST_MS } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/errors";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/profile",
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));

type Sent = { method: string; path: string; body: unknown };
let sent: Sent[] = [];
let answers: Record<string, () => Response> = {};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const failure = (code: string, status: number) =>
  json({ error: { code, message: "x", details: null } }, status);

const profile = (extra = {}) => ({
  target_roles: [],
  skills: [],
  locations: [],
  seniority: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  updated_at: null,
  weights: {},
  ...extra,
});
const preferences = {
  email_enabled: false,
  telegram_enabled: false,
  telegram_linked: false,
  frequency: "daily",
  min_score: 70,
  digest_hour_utc: 7,
  email_unsubscribed_at: null,
};

beforeEach(() => {
  sent = [];
  answers = {};
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      const body = input.method === "GET" ? null : await input.clone().json();
      sent.push({ method: input.method, path: url.pathname, body });
      const key = `${input.method} ${url.pathname}`;
      const answer = answers[key];
      if (answer) return answer();
      if (key === "GET /v1/profile") return json(profile());
      if (key === "GET /v1/notifications/preferences") return json(preferences);
      if (key === "PATCH /v1/profile") return json(profile(body as object));
      if (key === "PATCH /v1/notifications/preferences") {
        return json({ ...preferences, ...(body as object) });
      }
      if (key === "PATCH /v1/settings") {
        return json({ email: "a@b.co", locale: (body as { locale: string }).locale });
      }
      return failure("internal_error", 500);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderIn(ui: React.ReactElement, locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>{ui}</AppProviders>
    </NextIntlClientProvider>,
  );
}

const patches = (path: string) => sent.filter((s) => s.method === "PATCH" && s.path === path);

describe("tag input", () => {
  function Harness({ initial = [] as string[], max = 5 }) {
    const [value, setValue] = useState(initial);
    return (
      <NextIntlClientProvider locale="en" messages={en}>
        <label htmlFor="t">Roles</label>
        <TagInput id="t" value={value} onChange={setValue} max={max} />
      </NextIntlClientProvider>
    );
  }

  it("adds on Enter and on comma, removes with the button and with Backspace", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Roles");
    fireEvent.change(input, { target: { value: "Data engineer" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "SQL," } });
    expect(screen.getByText("Data engineer")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Data engineer" }));
    expect(screen.queryByText("Data engineer")).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.queryByText("SQL")).not.toBeInTheDocument();
  });

  it("adds text left in the field when it loses focus, and a paste becomes several items", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Roles");
    fireEvent.change(input, { target: { value: "Go" } });
    fireEvent.blur(input);
    fireEvent.paste(input, {
      clipboardData: { getData: () => ["Rust, Zig", "C"].join(String.fromCharCode(10)) },
    });
    for (const tag of ["Go", "Rust", "Zig", "C"]) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it("ignores a duplicate and stops at the limit", () => {
    render(<Harness initial={["Go"]} max={2} />);
    const input = screen.getByLabelText("Roles");
    fireEvent.change(input, { target: { value: "go, Rust, Zig," } });
    expect(screen.getAllByText("Go")).toHaveLength(1);
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.queryByText("Zig")).not.toBeInTheDocument();
    expect(screen.getByText("You reached the limit of 2.")).toBeInTheDocument();
  });
});

describe("profile page", () => {
  it("shows the saved profile and says when there is nothing to save", async () => {
    answers["GET /v1/profile"] = () =>
      json(profile({ target_roles: ["Data engineer"], seniority: "senior" }));
    renderIn(<ProfileScreen />);
    expect(await screen.findByText("Data engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Senior", pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("No changes to save.")).toBeInTheDocument();
    expect(patches("/v1/profile")).toHaveLength(0);
  });

  it("sends only the changed fields, then confirms with a toast", async () => {
    answers["GET /v1/profile"] = () => json(profile({ skills: ["SQL"] }));
    renderIn(<ProfileScreen />);
    fireEvent.change(await screen.findByLabelText("Target roles"), {
      target: { value: "Data engineer," },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    expect(patches("/v1/profile")).toEqual([
      { method: "PATCH", path: "/v1/profile", body: { target_roles: ["Data engineer"] } },
    ]);
  });

  it("explains a salary problem on its field and does not call the API", async () => {
    renderIn(<ProfileScreen />);
    fireEvent.change(await screen.findByLabelText("Minimum"), { target: { value: "9000" } });
    fireEvent.change(screen.getByLabelText("Maximum"), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "tnd" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("The minimum is higher than the maximum.")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum")).toHaveAttribute("aria-invalid", "true");
    expect(patches("/v1/profile")).toHaveLength(0);
  });

  it("puts a problem the API finds on its field", async () => {
    answers["PATCH /v1/profile"] = () => failure("invalid_salary_range", 422);
    renderIn(<ProfileScreen />);
    fireEvent.change(await screen.findByLabelText("Minimum"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "TND" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("The minimum is higher than the maximum.")).toBeInTheDocument();
  });

  it("shows a load error with its code, and loads again on request", async () => {
    answers["GET /v1/profile"] = () => failure("auth_unavailable", 503);
    renderIn(<ProfileScreen />);
    expect(
      await screen.findByText("Your profile could not be loaded.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("auth_unavailable")).toBeInTheDocument();

    answers["GET /v1/profile"] = () => json(profile({ skills: ["SQL"] }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SQL")).toBeInTheDocument();
  });

  it("speaks Arabic", async () => {
    renderIn(<ProfileScreen />, "ar");
    expect(await screen.findByRole("heading", { name: "الملف الشخصي" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "حفظ الملف الشخصي" })).toBeInTheDocument();
  });
});

describe("onboarding", () => {
  async function ready() {
    renderIn(<OnboardingWizard />);
    return screen.findByRole("heading", { name: "Which roles are you looking for?" });
  }
  const skip = () => fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

  it("starts at step 1 of 5, saves a step on Next, and moves on", async () => {
    await ready();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Data engineer," },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      await screen.findByRole("heading", { name: "Which skills do you have?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(patches("/v1/profile")[0]?.body).toEqual({ target_roles: ["Data engineer"] });
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("skips a step without saving what was typed there", async () => {
    await ready();
    fireEvent.change(screen.getByLabelText("Target roles"), {
      target: { value: "Data engineer," },
    });
    skip();
    expect(
      await screen.findByRole("heading", { name: "Which skills do you have?" }),
    ).toBeInTheDocument();
    expect(patches("/v1/profile")).toHaveLength(0);
  });

  it("finishes with the alert settings and goes to the feed", async () => {
    await ready();
    for (let i = 0; i < 4; i += 1) skip();
    expect(
      await screen.findByRole("heading", { name: "How should Fursa tell you about good jobs?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Email me about good matches"));
    fireEvent.change(screen.getByLabelText("Only jobs scoring at least"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByText("Enter a number from 0 to 100.")).toBeInTheDocument();
    expect(patches("/v1/notifications/preferences")).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Only jobs scoring at least"), {
      target: { value: "80" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/feed"));
    expect(patches("/v1/notifications/preferences")[0]?.body).toEqual({
      email_enabled: true,
      frequency: "daily",
      min_score: 80,
      digest_hour_utc: 7,
    });
  });

  it("goes to the feed when the last step is skipped, saving nothing", async () => {
    await ready();
    for (let i = 0; i < 5; i += 1) skip();
    expect(router.replace).toHaveBeenCalledWith("/feed");
    expect(sent.filter((s) => s.method === "PATCH")).toHaveLength(0);
  });

  it("is prefilled when the profile already has data", async () => {
    answers["GET /v1/profile"] = () => json(profile({ target_roles: ["Analyst"] }));
    renderIn(<OnboardingWizard />);
    expect(await screen.findByText("Analyst")).toBeInTheDocument();
  });
});

describe("language and the account", () => {
  it("saves the new language to the account, then changes the page", async () => {
    renderIn(<LanguageSwitcher syncAccount />);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fr" } });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(patches("/v1/settings")[0]?.body).toEqual({ locale: "fr" });
  });

  it("changes the page anyway when saving fails, and says so", async () => {
    answers["PATCH /v1/settings"] = () => failure("internal_error", 500);
    renderIn(<LanguageSwitcher syncAccount />);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "fr" } });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(await screen.findByText(/could not be saved to your account/)).toBeInTheDocument();
  });

  it("does not call the API without syncAccount", async () => {
    renderIn(<LanguageSwitcher />);
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "ar" } });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(sent).toHaveLength(0);
  });
});

describe("empty feed", () => {
  it("asks for target roles when there are none", async () => {
    renderIn(<FeedNudge />);
    expect(await screen.findByText("No matches yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your target roles" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("says nothing when the roles exist", async () => {
    answers["GET /v1/profile"] = () => json(profile({ target_roles: ["Analyst"] }));
    renderIn(<FeedNudge />);
    await waitFor(() => expect(sent.length).toBeGreaterThan(0));
    await act(async () => {});
    expect(screen.queryByText("No matches yet.")).not.toBeInTheDocument();
  });
});

describe("toast and retries", () => {
  it("leaves after six seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderIn(<ProfileScreen />);
      fireEvent.change(await screen.findByLabelText("Skills"), { target: { value: "Go," } });
      fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
      expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(TOAST_MS + 50);
      });
      expect(screen.queryByText("Profile saved.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes with its button", async () => {
    renderIn(<ProfileScreen />);
    fireEvent.change(await screen.findByLabelText("Skills"), { target: { value: "Go," } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    const toast = (await screen.findByText("Profile saved.")).parentElement as HTMLElement;
    fireEvent.click(within(toast).getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Profile saved.")).not.toBeInTheDocument();
  });

  it("retries once, and only for the network or the server", () => {
    const server = new ApiError({ status: 500, code: "internal_error", message: "x" });
    const mine = new ApiError({ status: 422, code: "validation_error", message: "x" });
    const offline = new ApiError({ status: 0, code: "network_error", message: "x" });
    expect(shouldRetry(0, server)).toBe(true);
    expect(shouldRetry(1, server)).toBe(false);
    expect(shouldRetry(0, mine)).toBe(false);
    expect(shouldRetry(0, offline)).toBe(true);
  });
});
