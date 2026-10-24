import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineBoard } from "@/components/features/pipeline/pipeline-board";
import { AppProviders } from "@/components/providers/app-providers";
import { matchesSearch } from "@/lib/pipeline/values";
import { insertByScore, removeFromPages, type FeedPage, type JobSummary } from "@/lib/feed/values";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/pipeline",
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}) }));

type Sent = { method: string; path: string; query: URLSearchParams; body: unknown };
let sent: Sent[] = [];
let answers: Record<string, () => Response> = {};
let lists: Record<string, JobSummary[]> = {};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const failure = (code: string, status: number) =>
  json({ error: { code, message: "x", details: null } }, status);

const job = (n: number, status: string, extra: Partial<JobSummary> = {}): JobSummary => ({
  job_id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  score: 90 - n,
  status: status as JobSummary["status"],
  explanation: null,
  title: `Job ${n}`,
  company: `Company ${n}`,
  location: "Tunis",
  country: "Tunisia",
  remote: null,
  url: `https://jobs.example.com/${n}`,
  source: "example",
  posted_at: new Date(Date.now() - 86_400_000).toISOString(),
  is_active: true,
  updated_at: "2026-10-01T00:00:00Z",
  ...extra,
});
const id = (n: number) => job(n, "saved").job_id;

beforeEach(() => {
  sent = [];
  answers = {};
  lists = {
    saved: [job(1, "saved"), job(2, "saved")],
    applied: [job(3, "applied")],
    interview: [],
    rejected: [job(4, "rejected")],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      const body = await input
        .clone()
        .json()
        .catch(() => null);
      sent.push({ method: input.method, path: url.pathname, query: url.searchParams, body });
      const key = `${input.method} ${url.pathname}`;
      const status = url.searchParams.get("status") ?? "";
      const answer = answers[`${key}?${status}`] ?? answers[key];
      if (answer) return answer();
      if (key === "GET /v1/feed") {
        return json({ items: lists[status] ?? [], next_cursor: null } satisfies FeedPage);
      }
      if (input.method === "PUT" && url.pathname.endsWith("/status")) {
        const jobId = url.pathname.split("/")[3]!;
        const found = Object.values(lists)
          .flat()
          .find((j) => j.job_id === jobId)!;
        return json({ ...found, status: (body as { status: string }).status, description: null });
      }
      return failure("internal_error", 500);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderBoard(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>
        <PipelineBoard />
      </AppProviders>
    </NextIntlClientProvider>,
  );
}

const column = (name: string) => screen.getByRole("region", { name });
const puts = () => sent.filter((s) => s.method === "PUT");

/** Radix opens a menu on Enter (the keyboard path), which jsdom handles. */
async function openMoveMenu(title: string) {
  const trigger = await screen.findByRole("button", { name: `Move ${title}` });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

describe("pure list edits", () => {
  const page = (...items: JobSummary[]): { pages: FeedPage[]; pageParams: unknown[] } => ({
    pages: [{ items, next_cursor: null }],
    pageParams: [null],
  });

  it("removes a job and returns it", () => {
    const data = page(job(1, "saved"), job(2, "saved"));
    const { data: next, removed } = removeFromPages(data, id(1));
    expect(removed?.title).toBe("Job 1");
    expect(next?.pages[0]?.items.map((j) => j.title)).toEqual(["Job 2"]);
    expect(data.pages[0]?.items).toHaveLength(2);
    expect(removeFromPages(data, "nope").removed).toBeNull();
  });

  it("inserts in score order, once, and at the end when it scores lowest", () => {
    const data = page(job(1, "x"), job(3, "x"));
    const middle = insertByScore(data, job(2, "x"));
    expect(middle?.pages[0]?.items.map((j) => j.title)).toEqual(["Job 1", "Job 2", "Job 3"]);
    expect(insertByScore(middle, job(2, "x"))).toBe(middle);
    expect(insertByScore(data, job(9, "x"))?.pages[0]?.items.at(-1)?.title).toBe("Job 9");
    expect(insertByScore(undefined, job(1, "x"))).toBeUndefined();
  });
});

describe("matchesSearch", () => {
  const j = { title: "Ingénieur DevOps H/F", company: "Extia" };
  it("matches every word in the title or company, ignoring case and accents", () => {
    expect(matchesSearch(j, "")).toBe(true);
    expect(matchesSearch(j, "  ")).toBe(true);
    expect(matchesSearch(j, "ingenieur")).toBe(true);
    expect(matchesSearch(j, "DEVOPS extia")).toBe(true);
    expect(matchesSearch(j, "devops google")).toBe(false);
  });
});

describe("pipeline board", () => {
  it("asks for one list per status and shows the jobs in their columns, with counts", async () => {
    renderBoard();
    await screen.findByText("Job 1");
    const asked = sent.filter((s) => s.path === "/v1/feed").map((s) => s.query.get("status"));
    expect(asked.sort()).toEqual(["applied", "interview", "rejected", "saved"]);
    expect(sent.every((s) => s.query.get("limit") === null || s.query.get("limit") === "20")).toBe(
      true,
    );

    const saved = column("Saved");
    expect(within(saved).getByText("Job 1")).toBeInTheDocument();
    expect(within(saved).getByText("Job 2")).toBeInTheDocument();
    expect(within(saved).getByRole("heading")).toHaveTextContent("2");
    expect(within(column("Applied")).getByText("Job 3")).toBeInTheDocument();
    expect(within(column("Rejected")).getByText("Job 4")).toBeInTheDocument();
    expect(within(saved).getByRole("link", { name: "Job 1" })).toHaveAttribute(
      "href",
      `/jobs/${id(1)}`,
    );
  });

  it("says what an empty column is for", async () => {
    renderBoard();
    await screen.findByText("Job 1");
    const interview = column("Interview");
    expect(await within(interview).findByText("Nothing here yet.")).toBeInTheDocument();
    expect(
      within(interview).getByText("Move a job here from the feed or another column."),
    ).toBeInTheDocument();
  });

  it("shows a plus after the count when a column has another page, and loads it with its cursor", async () => {
    answers["GET /v1/feed?saved"] = () => {
      const last = sent[sent.length - 1]!;
      return last.query.get("cursor")
        ? json({ items: [job(5, "saved")], next_cursor: null })
        : json({ items: [job(1, "saved"), job(2, "saved")], next_cursor: "c1" });
    };
    renderBoard();
    await screen.findByText("Job 1");
    expect(within(column("Saved")).getByRole("heading")).toHaveTextContent("2+");
    fireEvent.click(within(column("Saved")).getByRole("button", { name: "Load more" }));
    await screen.findByText("Job 5");
    expect(
      sent.some((s) => s.query.get("cursor") === "c1" && s.query.get("status") === "saved"),
    ).toBe(true);
    expect(within(column("Saved")).getByRole("heading")).toHaveTextContent("3");
  });

  it("keeps working when one column fails to load", async () => {
    answers["GET /v1/feed?rejected"] = () => failure("origin_not_allowed", 403);
    renderBoard();
    await screen.findByText("Job 1");
    expect(await within(column("Rejected")).findByRole("alert")).toHaveTextContent(
      "origin_not_allowed",
    );
    expect(within(column("Applied")).getByText("Job 3")).toBeInTheDocument();
  });
});

describe("search and card layout", () => {
  it("filters the loaded cards in every column by title or company, and says when none match", async () => {
    renderBoard();
    await screen.findByText("Job 1");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search roles or companies" }), {
      target: { value: "company 3" },
    });
    expect(within(column("Applied")).getByText("Job 3")).toBeInTheDocument();
    expect(screen.queryByText("Job 1")).not.toBeInTheDocument();
    expect(within(column("Saved")).getByText("No job matches in this column.")).toBeInTheDocument();
    expect(within(column("Saved")).getByRole("heading")).toHaveTextContent("0");
    // A column that is truly empty still says what it is for.
    expect(within(column("Interview")).getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("shows the company first, then the title, the place, the score and how long ago", async () => {
    renderBoard();
    const card = (await screen.findByText("Job 1")).closest("li")!;
    expect(card.querySelector("[data-slot=company-logo]")).toHaveTextContent("C");
    expect(within(card).getByText("Company 1")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Job 1" })).toBeInTheDocument();
    expect(within(card).getByText("Tunis")).toBeInTheDocument();
    expect(within(card).getByText("89")).toBeInTheDocument();
    expect(within(card).getByText("Strong")).toBeInTheDocument();
    expect(within(card).getByText("yesterday")).toBeInTheDocument();
  });
});

describe("moving a job", () => {
  it("offers the other columns and Back to new in the Move to menu", async () => {
    renderBoard();
    const menu = await openMoveMenu("Job 1");
    const labels = Array.from(menu.querySelectorAll("[role=menuitem]")).map((el) => el.textContent);
    expect(labels).toEqual(["Applied", "Interview", "Rejected", "Back to new"]);
    expect(within(menu).getByText("Move to")).toBeInTheDocument();
  });

  it("moves the card to the new column at once, sends the status, and says so", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const original = fetch as unknown as (r: Request) => Promise<Response>;
    vi.stubGlobal("fetch", async (input: Request) => {
      if (input.method === "PUT") await gate;
      return original(input);
    });
    renderBoard();
    const menu = await openMoveMenu("Job 1");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Interview" }));

    // Before the API has answered.
    await waitFor(() => expect(within(column("Interview")).getByText("Job 1")).toBeInTheDocument());
    expect(within(column("Saved")).queryByText("Job 1")).not.toBeInTheDocument();
    expect(within(column("Saved")).getByRole("heading")).toHaveTextContent("1");

    release();
    await screen.findByText("Moved to Interview.");
    expect(puts()).toHaveLength(1);
    expect(puts()[0]!.path).toBe(`/v1/jobs/${id(1)}/status`);
    expect(puts()[0]!.body).toEqual({ status: "interview" });
  });

  it("puts the card back and says so when the API refuses", async () => {
    answers["PUT /v1/jobs/" + id(1) + "/status"] = () => failure("internal_error", 500);
    renderBoard();
    const menu = await openMoveMenu("Job 1");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Rejected" }));
    await screen.findByText("The job could not be moved. It was put back.");
    expect(within(column("Saved")).getByText("Job 1")).toBeInTheDocument();
    expect(within(column("Rejected")).queryByText("Job 1")).not.toBeInTheDocument();
  });

  it("keeps the score order in the column it joins", async () => {
    renderBoard();
    const menu = await openMoveMenu("Job 4"); // Job 4 is in Rejected; move to Applied (holds Job 3)
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Applied" }));
    await screen.findByText("Moved to Applied.");
    const titles = within(column("Applied"))
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(titles).toEqual(["Job 3", "Job 4"]);
  });

  it("takes the job off the board with Back to new", async () => {
    renderBoard();
    const menu = await openMoveMenu("Job 2");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Back to new" }));
    await screen.findByText("Moved to New.");
    expect(puts()[0]!.body).toEqual({ status: "new" });
    expect(screen.queryByText("Job 2")).not.toBeInTheDocument();
  });

  it("every card has a drag handle with a name, for the keyboard", async () => {
    renderBoard();
    const handle = await screen.findByRole("button", { name: "Drag Job 1" });
    expect(handle).toHaveAttribute("aria-roledescription", "draggable");
    expect(handle).toHaveAttribute("aria-describedby");
  });
});

describe("views", () => {
  it("has a Board and a List view, and the list view shows the statuses as tabs", async () => {
    renderBoard();
    await screen.findByText("Job 1");
    expect(screen.getByRole("button", { name: "Board", pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("button", { name: "List", pressed: true })).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Saved", "Applied", "Interview", "Rejected"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(tabs[1]!);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    // Only the chosen column is shown in the list view.
    expect(column("Applied").className).toContain("block");
    expect(column("Saved").className).toContain("hidden");
  });
});

describe("right to left", () => {
  it("shows the columns in Arabic", async () => {
    renderBoard("ar");
    expect(await screen.findByRole("heading", { name: "المتابعة" })).toBeInTheDocument();
    expect(await screen.findByText("Job 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "لوحة", pressed: true })).toBeInTheDocument();
  });
});
