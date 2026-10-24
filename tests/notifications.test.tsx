import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsSettings } from "@/components/features/notifications/notifications-settings";
import { AppProviders } from "@/components/providers/app-providers";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({ refreshSession: vi.fn(), signOutAction: vi.fn() }));
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/settings",
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

type Sent = { method: string; path: string; body: unknown };
let sent: Sent[] = [];
let answers: Record<string, () => Response> = {};
let prefs = {} as ReturnType<typeof basePrefs>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const failure = (code: string, status: number) =>
  json({ error: { code, message: "x", details: null } }, status);

const basePrefs = () => ({
  email_enabled: false,
  telegram_enabled: false,
  telegram_linked: false,
  frequency: "daily" as "daily" | "instant",
  min_score: 70,
  digest_hour_utc: 7,
  email_unsubscribed_at: null as string | null,
});

beforeEach(() => {
  sent = [];
  answers = {};
  prefs = basePrefs();
  nav.replace.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      // A POST with no body (the Telegram link) has nothing to parse.
      const body = await input
        .clone()
        .json()
        .catch(() => null);
      sent.push({ method: input.method, path: url.pathname, body });
      const key = `${input.method} ${url.pathname}`;
      const answer = answers[key];
      if (answer) return answer();
      if (key === "GET /v1/notifications/preferences") return json(prefs);
      if (key === "PATCH /v1/notifications/preferences") {
        prefs = { ...prefs, ...(body as object) };
        return json(prefs);
      }
      if (key === "POST /v1/notifications/telegram/link") {
        return json({ url: "https://t.me/FursaBot?start=abc", expires_in_seconds: 900 });
      }
      if (key === "DELETE /v1/notifications/telegram") {
        prefs = { ...prefs, telegram_linked: false, telegram_enabled: false };
        return json(prefs);
      }
      return failure("internal_error", 500);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderIn(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>
        <NotificationsSettings />
      </AppProviders>
    </NextIntlClientProvider>,
  );
}
const patches = () => sent.filter((s) => s.method === "PATCH");

describe("alerts", () => {
  it("shows email off and says there is nothing to save when nothing changed", async () => {
    renderIn();
    const email = await screen.findByRole("checkbox", { name: "Send me emails" });
    expect(email).not.toBeChecked();
    expect(screen.queryByText("Only jobs scoring at least")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("No changes to save.")).toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });

  it("sends only the fields that changed, then confirms", async () => {
    renderIn();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Send me emails" }));
    fireEvent.click(screen.getByRole("button", { name: "As soon as a job matches" }));
    fireEvent.change(screen.getByLabelText("Only jobs scoring at least"), {
      target: { value: "85" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Alert settings saved");
    expect(patches()).toHaveLength(1);
    expect(patches()[0]!.body).toEqual({
      email_enabled: true,
      frequency: "instant",
      min_score: 85,
    });

    // A second save with nothing new sends nothing.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("No changes to save.");
    expect(patches()).toHaveLength(1);
  });

  it("does not save a score outside 0 to 100", async () => {
    renderIn();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Send me emails" }));
    fireEvent.change(screen.getByLabelText("Only jobs scoring at least"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a number from 0 to 100.")).toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });

  it("says when the person unsubscribed from emails", async () => {
    prefs.email_unsubscribed_at = "2026-10-01T10:00:00Z";
    renderIn();
    expect(await screen.findByText(/You unsubscribed from emails on/)).toBeInTheDocument();
  });

  it("shows the schedule fields when only Telegram is on, with the shared note", async () => {
    prefs = { ...prefs, telegram_linked: true, telegram_enabled: true };
    renderIn();
    expect(await screen.findByLabelText("Only jobs scoring at least")).toBeInTheDocument();
    expect(
      screen.getByText("The schedule and the minimum score apply to email and Telegram."),
    ).toBeInTheDocument();
  });

  it("shows the error panel when saving fails", async () => {
    answers["PATCH /v1/notifications/preferences"] = () => failure("validation_error", 422);
    renderIn();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Send me emails" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("validation_error");
  });

  it("shows a retry when the preferences cannot be loaded", async () => {
    answers["GET /v1/notifications/preferences"] = () => failure("origin_not_allowed", 403);
    renderIn();
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("telegram", () => {
  it("offers to link when not linked, and opens the one-time link safely", async () => {
    renderIn();
    expect(await screen.findByText("Telegram is not linked.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Link Telegram" }));
    const link = await screen.findByRole("link", { name: /Open Telegram/ });
    expect(link).toHaveAttribute("href", "https://t.me/FursaBot?start=abc");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/expires in 15 min/)).toBeInTheDocument();
    expect(screen.getByText("Waiting for you to press Start in Telegram")).toBeInTheDocument();
    expect(sent.filter((s) => s.method === "POST")).toHaveLength(1);
  });

  it("refuses a link that is not on t.me", async () => {
    answers["POST /v1/notifications/telegram/link"] = () =>
      json({ url: "https://evil.example/x", expires_in_seconds: 900 });
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: /Open Telegram/ })).not.toBeInTheDocument();
  });

  it("says Telegram is not set up on this server", async () => {
    answers["POST /v1/notifications/telegram/link"] = () => failure("telegram_not_configured", 503);
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    expect(await screen.findByText("Telegram is not set up on this server.")).toBeInTheDocument();
  });

  it("checks every 3 seconds and shows the linked state when the chat is linked", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    await screen.findByRole("link", { name: /Open Telegram/ });
    const before = sent.filter((s) => s.path === "/v1/notifications/preferences").length;

    prefs = { ...prefs, telegram_linked: true, telegram_enabled: true };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200);
    });
    await screen.findByText("Telegram is linked.");
    expect(screen.getByText("Telegram is linked")).toBeInTheDocument(); // the toast
    expect(sent.filter((s) => s.path === "/v1/notifications/preferences").length).toBeGreaterThan(
      before,
    );
    expect(screen.getByRole("checkbox", { name: "Send alerts to Telegram" })).toBeChecked();

    // Polling stops once linked.
    const after = sent.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(sent.length).toBe(after);
  });

  it("stops checking and offers to link again when the link expires", async () => {
    answers["POST /v1/notifications/telegram/link"] = () =>
      json({ url: "https://t.me/FursaBot?start=abc", expires_in_seconds: 5 });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    await screen.findByRole("link", { name: /Open Telegram/ });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByText("The link expired. Link Telegram again.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open Telegram/ })).not.toBeInTheDocument();
    const after = sent.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(sent.length).toBe(after);
    expect(screen.getByRole("button", { name: "Link Telegram" })).toBeInTheDocument();
  });

  it("switches Telegram alerts on and off at once", async () => {
    prefs = { ...prefs, telegram_linked: true };
    renderIn();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Send alerts to Telegram" }));
    await screen.findByText("Telegram setting saved");
    expect(patches()[0]!.body).toEqual({ telegram_enabled: true });
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Send alerts to Telegram" })).toBeChecked(),
    );
  });

  it("unlinks Telegram and goes back to the not linked state", async () => {
    prefs = { ...prefs, telegram_linked: true, telegram_enabled: true };
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Unlink Telegram" }));
    await screen.findByText("Telegram was unlinked");
    expect(sent.some((s) => s.method === "DELETE" && s.path === "/v1/notifications/telegram")).toBe(
      true,
    );
    expect(await screen.findByText("Telegram is not linked.")).toBeInTheDocument();
  });

  it("goes to login when the session is gone", async () => {
    answers["POST /v1/notifications/telegram/link"] = () => failure("invalid_token", 401);
    renderIn();
    fireEvent.click(await screen.findByRole("button", { name: "Link Telegram" }));
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith({
        pathname: "/login",
        query: { next: "/settings" },
      }),
    );
  });
});

describe("right to left", () => {
  it("shows the alert and Telegram groups in Arabic", async () => {
    renderIn("ar");
    expect(await screen.findByRole("heading", { name: "التنبيهات" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "تيليجرام" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ربط تيليجرام" })).toBeInTheDocument();
  });
});
