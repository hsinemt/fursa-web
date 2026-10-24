import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedShell } from "@/components/features/feed/feed-shell";
import { JobDetailScreen } from "@/components/features/feed/job-detail";
import { AppProviders } from "@/components/providers/app-providers";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({ refreshSession: vi.fn(), signOutAction: vi.fn() }));
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/feed",
  search: new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => nav.search,
}));

type Sent = { method: string; path: string; query: URLSearchParams; body: unknown };
let sent: Sent[] = [];
let answers: Record<string, () => Response> = {};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const failure = (code: string, status: number, headers: Record<string, string> = {}) =>
  json({ error: { code, message: "x", details: null } }, status, headers);

const summary = (n: number, extra: Record<string, unknown> = {}) => ({
  job_id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  score: 90 - n,
  status: "new",
  explanation: n === 1 ? "Your Python and SQL match." : null,
  title: `Job ${n}`,
  company: `Company ${n}`,
  location: "Tunis",
  country: "Tunisia",
  remote: null,
  url: `https://jobs.example.com/${n}`,
  source: "example",
  posted_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  is_active: true,
  updated_at: "2026-10-01T00:00:00Z",
  ...extra,
});
const ID1 = summary(1).job_id;

const detail = (extra: Record<string, unknown> = {}) => ({
  ...summary(1),
  description:
    "<p>Build <b>pipelines</b>.</p><script>window.hacked = 1</script><p>R&amp;D team</p>",
  extracted: {
    remote_type: "hybrid",
    employment_type: "full_time",
    seniority: "senior",
    salary: { min: 50000, max: 70000, currency: "EUR", period: "year" },
    tech_stack: ["Python", "SQL", "Docker"],
    languages: ["en"],
    visa_sponsorship: "unknown",
    relocation_support: "yes",
  },
  breakdown: {
    components: {
      title: 1,
      skills: 0.5,
      location: 1,
      seniority: null,
      recency: 0.8,
      similarity: 0.7,
    },
    matched_skills: ["Python", "SQL"],
  },
  ...extra,
});

const profile = (roles: string[]) => ({
  target_roles: roles,
  skills: [],
  locations: [],
  seniority: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  updated_at: null,
  weights: {},
});

const page = (from: number, count: number, next: string | null) => ({
  items: Array.from({ length: count }, (_, i) => summary(from + i)),
  next_cursor: next,
});

beforeEach(() => {
  sent = [];
  answers = {};
  nav.replace.mockClear();
  nav.pathname = "/feed";
  nav.search = new URLSearchParams();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      const body = input.method === "GET" ? null : await input.clone().json();
      sent.push({ method: input.method, path: url.pathname, query: url.searchParams, body });
      const key = `${input.method} ${url.pathname}`;
      const answer = answers[key];
      if (answer) return answer();
      if (key === "GET /v1/profile") return json(profile(["Data engineer"]));
      if (key === "GET /v1/feed") {
        return json(url.searchParams.get("cursor") ? page(3, 2, null) : page(1, 2, "c1"));
      }
      if (key === `GET /v1/jobs/${ID1}`) return json(detail());
      if (key === `PUT /v1/jobs/${ID1}/status`) {
        return json(detail({ status: (body as { status: string }).status }));
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
const feed = () =>
  renderIn(
    <FeedShell>
      <p>side</p>
    </FeedShell>,
  );
const feedCalls = () => sent.filter((s) => s.path === "/v1/feed");

describe("feed list", () => {
  it("shows the first page as rows with score, reason and a link, and asks for 20", async () => {
    feed();
    const list = await screen.findByRole("list", { name: "Jobs" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Job 1")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("89")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Strong")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("Your Python and SQL match.")).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("link")).toHaveAttribute("href", `/jobs/${ID1}`);
    expect(feedCalls()[0]!.query.get("limit")).toBe("20");
    expect(feedCalls()[0]!.query.has("cursor")).toBe(false);
    expect(feedCalls()[0]!.query.has("status")).toBe(false);
  });

  it("loads the next page with the cursor, and the button goes when there is no next cursor", async () => {
    feed();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await screen.findByText("Job 4");
    expect(feedCalls()[1]!.query.get("cursor")).toBe("c1");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("marks the open job as current and keeps the filter in the job links", async () => {
    nav.pathname = `/jobs/${ID1}`;
    nav.search = new URLSearchParams("status=saved");
    feed();
    const link = await screen.findByRole("link", { name: /Job 1/ });
    expect(link).toHaveAttribute("aria-current", "true");
    expect(link).toHaveAttribute("href", `/jobs/${ID1}?status=saved`);
    expect(feedCalls()[0]!.query.get("status")).toBe("saved");
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  });

  it("puts the status filter in the address", async () => {
    feed();
    await screen.findByText("Job 1");
    fireEvent.click(screen.getByRole("button", { name: "Applied" }));
    expect(nav.replace).toHaveBeenCalledWith("/feed?status=applied");
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed");
  });

  it("shows a logo tile with the company initial, the company and the place on their own lines", async () => {
    feed();
    const row = (await screen.findByText("Job 1")).closest("li")!;
    expect(row.querySelector("[data-slot=company-logo]")).toHaveTextContent("C");
    expect(within(row).getByText("Company 1")).toBeInTheDocument();
    expect(within(row).getByText(/^Tunis · 3 days ago$/)).toBeInTheDocument();
  });

  it("keeps the status filter on one row (it scrolls instead of wrapping)", async () => {
    feed();
    const group = await screen.findByRole("group", { name: "Show jobs by status" });
    expect(group.className).toContain("overflow-x-auto");
    expect(group.className).not.toContain("flex-wrap");
  });

  it("sorts the loaded jobs by posting date when Newest is chosen, and keeps it in the address", async () => {
    answers["GET /v1/feed"] = () =>
      json({
        items: [
          summary(1, { posted_at: "2026-09-01T00:00:00Z" }),
          summary(2, { posted_at: "2026-10-20T00:00:00Z" }),
        ],
        next_cursor: null,
      });
    const first = feed();
    await screen.findByText("Job 1");
    fireEvent.change(screen.getByRole("combobox", { name: "Sort jobs" }), {
      target: { value: "newest" },
    });
    expect(nav.replace).toHaveBeenCalledWith("/feed?sort=newest");
    first.unmount();

    nav.search = new URLSearchParams("sort=newest&status=saved");
    feed();
    await screen.findByText("Job 1");
    const titles = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(titles[0]).toContain("Job 2");
    expect(titles[1]).toContain("Job 1");
    expect(screen.getByRole("link", { name: /Job 1/ })).toHaveAttribute(
      "href",
      `/jobs/${ID1}?status=saved&sort=newest`,
    );
    expect(feedCalls().at(-1)!.query.has("sort")).toBe(false);
  });

  it("shows the status of a job that is not new, and Closed for a closed posting", async () => {
    answers["GET /v1/feed"] = () =>
      json({
        items: [summary(1, { status: "applied", is_active: false })],
        next_cursor: null,
      });
    feed();
    const row = (await screen.findByText("Job 1")).closest("li")!;
    expect(within(row).getByText("Applied")).toBeInTheDocument();
    expect(row).toHaveTextContent("Closed");
  });

  it("says why when there is nothing: no roles, no match, or an empty filter", async () => {
    answers["GET /v1/feed"] = () => json({ items: [], next_cursor: null });
    answers["GET /v1/profile"] = () => json(profile([]));
    const first = feed();
    await screen.findByText("Add your target roles so Fursa can find jobs.");
    first.unmount();

    answers["GET /v1/profile"] = () => json(profile(["Data engineer"]));
    const second = feed();
    await screen.findByText(
      "Fursa has not found a job that fits you so far. New matches appear here.",
    );
    second.unmount();

    nav.search = new URLSearchParams("status=rejected");
    feed();
    await screen.findByText("No jobs with this status.");
  });

  it("shows an error panel with a retry, and retries", async () => {
    let calls = 0;
    answers["GET /v1/feed"] = () =>
      calls++ === 0 ? failure("job_not_found", 404) : json(page(1, 1, null));
    feed();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("job_not_found");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Job 1");
  });

  it("counts down after a 429 and keeps the retry waiting", async () => {
    answers["GET /v1/feed"] = () => failure("rate_limited", 429, { "retry-after": "3" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      feed();
      await screen.findByText("Too many requests. Try again in 3 seconds.");
      expect(screen.getByRole("button", { name: "Try again in 3 s" })).toBeDisabled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      expect(screen.getByRole("button", { name: "Try again in 2 s" })).toBeDisabled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2200);
      });
      expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes to login on 401", async () => {
    answers["GET /v1/feed"] = () => failure("invalid_token", 401);
    feed();
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith({
        pathname: "/login",
        query: { next: "/feed" },
      }),
    );
  });

  it("reloads the list from the start when the cursor is refused", async () => {
    let firstPages = 0;
    answers["GET /v1/feed"] = () => {
      const last = sent[sent.length - 1]!;
      if (last.query.get("cursor")) return failure("invalid_cursor", 400);
      firstPages += 1;
      return json(page(1, 2, "c1"));
    };
    feed();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await screen.findByText("The list changed. Fursa is reloading it from the start.");
    await waitFor(() => expect(firstPages).toBe(2));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  });

  it("keeps the loaded rows when a later page fails", async () => {
    answers["GET /v1/feed"] = () => {
      const last = sent[sent.length - 1]!;
      return last.query.get("cursor") ? failure("internal_error", 500) : json(page(1, 2, "c1"));
    };
    feed();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(screen.getByText("Job 2")).toBeInTheDocument();
  });
});

describe("job detail", () => {
  const open = (locale: "en" | "ar" = "en") => renderIn(<JobDetailScreen id={ID1} />, locale);

  it("shows the title, facts, skills, the AI note, the breakdown and the description", async () => {
    open();
    expect(await screen.findByRole("heading", { level: 1, name: "Job 1" })).toBeInTheDocument();
    expect(screen.getByText(/^Company 1 · 3 days ago$/)).toBeInTheDocument();
    // The key facts, one row each.
    expect(screen.getByText("Tunis, Tunisia")).toBeInTheDocument();
    expect(screen.getByText("Hybrid · Full time")).toBeInTheDocument();
    expect(screen.getByText("50,000 – 70,000 EUR per year")).toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();

    const facts = screen.getByRole("heading", { name: "Facts" }).closest("section")!;
    expect(within(facts).getByText("Relocation support")).toBeInTheDocument();
    expect(within(facts).queryByText("Visa sponsorship")).not.toBeInTheDocument();

    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("Asked for, not in your profile")).toBeInTheDocument();

    expect(screen.getByText("Your Python and SQL match.")).toBeInTheDocument();
    expect(screen.getByText("Written by AI")).toBeInTheDocument();

    const breakdown = screen
      .getByRole("heading", { name: "How the score is made" })
      .closest("section")!;
    expect(within(breakdown).getAllByRole("listitem")).toHaveLength(5);
    expect(within(breakdown).queryByText("Level")).not.toBeInTheDocument();
    expect(within(breakdown).getByText("Freshness")).toBeInTheDocument();
  });

  it("renders the description as plain text, never as HTML", async () => {
    const { container } = open();
    await screen.findByText(/Build pipelines/);
    expect(screen.getByText("R&D team")).toBeInTheDocument();
    expect(container.querySelector("script, b")).toBeNull();
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
    expect(container.innerHTML).not.toContain("window.hacked");
  });

  it("shows a summary of responsibilities, qualifications and benefits, and the full posting on demand", async () => {
    answers[`GET /v1/jobs/${ID1}`] = () =>
      json(
        detail({
          description:
            "<p>About us</p><p>We make things.</p><h3>Responsibilities</h3><ul><li>Build pipelines</li><li>Review code</li></ul><h3>Requirements:</h3><ul><li>5 years of Python</li></ul><h3>What we offer</h3><ul><li>Remote work</li></ul><p>Apply today.</p>",
          extracted: { summary: "A data engineering role." },
        }),
      );
    open();
    expect(await screen.findByText("A data engineering role.")).toBeInTheDocument();
    const description = screen.getByRole("heading", { name: "Description" }).closest("section")!;
    for (const heading of ["Responsibilities", "Qualifications", "Benefits"]) {
      expect(within(description).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(within(description).getByText("Build pipelines")).toBeInTheDocument();
    expect(within(description).getByText("5 years of Python")).toBeInTheDocument();
    expect(within(description).getByText("Remote work")).toBeInTheDocument();
    expect(within(description).queryByText("We make things.")).not.toBeInTheDocument();
    expect(within(description).getByRole("button", { name: "Summary" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(description).getByRole("button", { name: "Full posting" }));
    expect(within(description).getByText("We make things.")).toBeInTheDocument();
    expect(within(description).getByText(/Apply today./)).toBeInTheDocument();
    expect(
      within(description).queryByRole("heading", { name: "Benefits" }),
    ).not.toBeInTheDocument();
  });

  it("shows the full posting without a switch when no part can be found", async () => {
    open();
    await screen.findByText(/Build pipelines/);
    expect(screen.queryByRole("button", { name: "Summary" })).not.toBeInTheDocument();
  });

  it("leaves the AI note and absent facts out when the API has none", async () => {
    answers[`GET /v1/jobs/${ID1}`] = () =>
      json(detail({ explanation: null, extracted: null, breakdown: null, description: null }));
    open();
    await screen.findByRole("heading", { level: 1, name: "Job 1" });
    expect(screen.queryByText("Why it matches")).not.toBeInTheDocument();
    expect(screen.queryByText("Written by AI")).not.toBeInTheDocument();
    expect(screen.queryByText("How the score is made")).not.toBeInTheDocument();
    expect(screen.getByText("The posting has no description.")).toBeInTheDocument();
  });

  it("opens the posting safely, and offers no link for an address that is not http or https", async () => {
    const first = open();
    const link = await screen.findByRole("link", { name: /Open posting/ });
    expect(link).toHaveAttribute("href", "https://jobs.example.com/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    first.unmount();

    answers[`GET /v1/jobs/${ID1}`] = () => json(detail({ url: "javascript:alert(1)" }));
    open();
    await screen.findByRole("heading", { level: 1, name: "Job 1" });
    expect(screen.queryByRole("link", { name: /Open posting/ })).not.toBeInTheDocument();
  });

  it("changes the status at once and sends it, with a toast", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = fetch as unknown as (r: Request) => Promise<Response>;
    vi.stubGlobal("fetch", async (input: Request) => {
      if (input.method === "PUT") await gate;
      return original(input);
    });
    open();
    await screen.findByRole("heading", { level: 1, name: "Job 1" });
    const group = screen.getByRole("group", { name: "Your status" });
    expect(within(group).getByRole("button", { name: "New" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(group).getByRole("button", { name: "Applied" }));
    // Shown before the API has answered.
    await waitFor(() =>
      expect(within(group).getByRole("button", { name: "Applied" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    release();
    await screen.findByText("Marked as Applied.");
    const put = sent.find((s) => s.method === "PUT")!;
    expect(put.path).toBe(`/v1/jobs/${ID1}/status`);
    expect(put.body).toEqual({ status: "applied" });
    // Save is for new and saved jobs only.
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("Save toggles between new and saved", async () => {
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Remove from saved" });
    fireEvent.click(screen.getByRole("button", { name: "Remove from saved" }));
    await screen.findByRole("button", { name: "Save" });
    expect(sent.filter((s) => s.method === "PUT").map((s) => s.body)).toEqual([
      { status: "saved" },
      { status: "new" },
    ]);
  });

  it("puts the status back and says so when the API refuses", async () => {
    answers[`PUT /v1/jobs/${ID1}/status`] = () => failure("internal_error", 500);
    open();
    await screen.findByRole("heading", { level: 1, name: "Job 1" });
    const group = screen.getByRole("group", { name: "Your status" });
    fireEvent.click(within(group).getByRole("button", { name: "Rejected" }));
    await screen.findByText("The status could not be changed. It was put back.");
    expect(within(group).getByRole("button", { name: "New" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "Rejected" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("says the job is not in the matches, with a way back", async () => {
    answers[`GET /v1/jobs/${ID1}`] = () => failure("job_not_found", 404);
    open();
    await screen.findByText("This job is not in your matches.");
    const links = screen.getAllByRole("link", { name: "Back to the feed" });
    expect(links.at(-1)).toHaveAttribute("href", "/feed");
  });

  it("shows an error panel for any other failure", async () => {
    answers[`GET /v1/jobs/${ID1}`] = () => failure("internal_error", 500);
    open();
    // A 500 is retried once (a second later) before the panel shows.
    await screen.findByRole("alert", {}, { timeout: 4000 });
  });

  it("works in Arabic: right-to-left strings, auto direction for posting text", async () => {
    open("ar");
    const title = await screen.findByRole("heading", { level: 1, name: "Job 1" });
    expect(title).toHaveAttribute("dir", "auto");
    expect(screen.getByText("حالتك")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /فتح الإعلان/ })).toBeInTheDocument();
    expect(screen.getByText("كتبه الذكاء الاصطناعي")).toBeInTheDocument();
  });
});
