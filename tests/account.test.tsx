import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataSection } from "@/components/features/account/data-section";
import { AppProviders } from "@/components/providers/app-providers";
import { confirmsDeletion, exportFileName } from "@/lib/account/values";
import * as actions from "@/lib/auth/actions";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/settings",
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));

type Sent = { method: string; path: string };
let sent: Sent[] = [];
let answers: Record<string, () => Response> = {};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const failure = (code: string, status: number, headers: Record<string, string> = {}) =>
  json({ error: { code, message: "x", details: null } }, status, headers);

const exported = {
  exported_at: "2026-10-24T10:00:00Z",
  account: { email: "secret.person@example.com", locale: "en" },
  profile: { target_roles: ["Data engineer"] },
  matches: [],
  ai_runs: [],
  notifications: {},
};

let downloads: { name: string; blob: Blob }[] = [];
let lastBlob: Blob | null = null;

beforeEach(() => {
  sent = [];
  answers = {};
  downloads = [];
  lastBlob = null;
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      sent.push({ method: input.method, path: url.pathname });
      const key = `${input.method} ${url.pathname}`;
      const answer = answers[key];
      if (answer) return answer();
      if (key === "GET /v1/account/export") return json(exported);
      if (key === "DELETE /v1/account") return new Response(null, { status: 204 });
      return failure("internal_error", 500);
    }),
  );
  URL.createObjectURL = vi.fn((blob: Blob) => {
    lastBlob = blob;
    return "blob:fake";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ name: this.download, blob: lastBlob! });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderIn(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>
        <DataSection />
      </AppProviders>
    </NextIntlClientProvider>,
  );
}

describe("values", () => {
  it("accepts the word in any letter case, with spaces around it", () => {
    expect(confirmsDeletion("DELETE")).toBe(true);
    expect(confirmsDeletion("  delete ")).toBe(true);
    expect(confirmsDeletion("delet")).toBe(false);
    expect(confirmsDeletion("DELETE ME")).toBe(false);
    expect(confirmsDeletion("")).toBe(false);
  });
  it("names the file with the date", () => {
    expect(exportFileName(new Date("2026-10-24T23:30:00Z"))).toBe("fursa-data-2026-10-24.json");
  });
});

describe("download my data", () => {
  it("saves the answer as a JSON file and never shows it on the page", async () => {
    const { container } = renderIn();
    fireEvent.click(screen.getByRole("button", { name: "Download my data" }));
    await screen.findByText("Your data was downloaded");

    expect(sent).toEqual([{ method: "GET", path: "/v1/account/export" }]);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]!.name).toMatch(/^fursa-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await downloads[0]!.blob.text())).toEqual(exported);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("secret.person@example.com");
    // The temporary link is gone from the page.
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("says the file holds personal data", () => {
    renderIn();
    expect(screen.getByText(/It holds personal data/)).toBeInTheDocument();
  });

  it("shows the error panel when the export fails, and downloads nothing", async () => {
    answers["GET /v1/account/export"] = () => failure("rate_limited", 429, { "retry-after": "5" });
    renderIn();
    fireEvent.click(screen.getByRole("button", { name: "Download my data" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many requests. Try again in 5 seconds.");
    expect(downloads).toHaveLength(0);
  });

  it("goes to login when the session is gone", async () => {
    answers["GET /v1/account/export"] = () => failure("invalid_token", 401);
    renderIn();
    fireEvent.click(screen.getByRole("button", { name: "Download my data" }));
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith({
        pathname: "/login",
        query: { next: "/settings" },
      }),
    );
  });
});

describe("delete my account", () => {
  async function openDialog() {
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    return screen.findByRole("dialog");
  }

  it("asks first: says what is erased and that it cannot be undone, and deletes nothing yet", async () => {
    renderIn();
    const dialog = await openDialog();
    expect(within(dialog).getByText("Delete your account?")).toBeInTheDocument();
    expect(within(dialog).getByText("This cannot be undone.")).toBeInTheDocument();
    expect(within(dialog).getByText(/closed separately/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Delete my account" })).toBeDisabled();
    expect(sent).toHaveLength(0);
  });

  it("stays disabled until the word is typed, then deletes and ends the session", async () => {
    renderIn();
    const dialog = await openDialog();
    const confirm = within(dialog).getByRole("button", { name: "Delete my account" });
    const input = within(dialog).getByLabelText("Type DELETE to confirm");

    fireEvent.change(input, { target: { value: "dele" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: "delete" } });
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    await waitFor(() => expect(actions.accountDeletedAction).toHaveBeenCalledTimes(1));
    expect(sent).toEqual([{ method: "DELETE", path: "/v1/account" }]);
  });

  it("cancel closes the dialog and forgets what was typed", async () => {
    renderIn();
    let dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sent).toHaveLength(0);

    dialog = await openDialog();
    expect(within(dialog).getByLabelText("Type DELETE to confirm")).toHaveValue("");
  });

  it("keeps the dialog open with the error when the API refuses, and does not end the session", async () => {
    answers["DELETE /v1/account"] = () => failure("internal_error", 500);
    renderIn();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete my account" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("internal_error");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(actions.accountDeletedAction).not.toHaveBeenCalled();
  });

  it("ends the session with the deleted notice when the API says the account is already gone", async () => {
    answers["DELETE /v1/account"] = () => failure("account_deleted", 403);
    renderIn();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete my account" }));
    await waitFor(() => expect(actions.accountDeletedAction).toHaveBeenCalled());
  });
});

describe("right to left", () => {
  it("shows both actions in Arabic, with the typed word left to right", async () => {
    renderIn("ar");
    expect(screen.getByRole("button", { name: "تنزيل بياناتي" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "حذف حسابي" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("اكتب DELETE للتأكيد")).toHaveAttribute("dir", "ltr");
  });
});
