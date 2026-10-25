import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeedShell } from "@/components/features/feed/feed-shell";
import { SEARCH_DELAY_MS } from "@/components/features/feed/feed-filters";
import { AppProviders } from "@/components/providers/app-providers";
import { CompanyLogo } from "@/components/ui/company-logo";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

vi.mock("@/lib/auth/actions", () => ({
  refreshSession: vi.fn(),
  signOutAction: vi.fn(),
  accountDeletedAction: vi.fn(),
}));
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

type Sent = { method: string; path: string; query: URLSearchParams };
let sent: Sent[] = [];
let items: Record<string, unknown>[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const summary = (n: number, extra: Record<string, unknown> = {}) => ({
  job_id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  score: 90 - n,
  status: "new",
  explanation: null,
  title: `Job ${n}`,
  company: `Company ${n}`,
  company_logo_url: null,
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

beforeEach(() => {
  sent = [];
  nav.replace.mockClear();
  nav.pathname = "/feed";
  nav.search = new URLSearchParams();
  items = [summary(1), summary(2)];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      sent.push({ method: input.method, path: url.pathname, query: url.searchParams });
      if (url.pathname === "/v1/feed") return json({ items, next_cursor: null });
      if (url.pathname === "/v1/profile") return json({ target_roles: ["x"] });
      return json({ error: { code: "internal_error", message: "x", details: null } }, 500);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderFeed(locale: "en" | "ar" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en}>
      <AppProviders>
        <FeedShell>
          <p>side</p>
        </FeedShell>
      </AppProviders>
    </NextIntlClientProvider>,
  );
}
const lastFeedCall = () => sent.filter((s) => s.path === "/v1/feed").at(-1)!;
const openPanel = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /^Filters/ }));
  return screen.findByRole("dialog");
};

describe("what the feed asks the API for", () => {
  it("sends nothing extra when no filter is on", async () => {
    renderFeed();
    await screen.findByText("Job 1");
    const q = lastFeedCall().query;
    for (const key of [
      "q",
      "min_score",
      "work_mode",
      "level",
      "employment_type",
      "posted_within_days",
      "sort",
    ]) {
      expect(q.has(key)).toBe(false);
    }
  });

  it("sends every choice of the address, repeating the ones that take several values", async () => {
    nav.search = new URLSearchParams(
      "status=saved&sort=newest&q=data+engineer&score=70&mode=remote,hybrid&level=senior&type=full_time,contract&days=7",
    );
    renderFeed();
    await screen.findByText("Job 1");
    const q = lastFeedCall().query;
    expect(q.get("status")).toBe("saved");
    expect(q.get("sort")).toBe("newest");
    expect(q.get("q")).toBe("data engineer");
    expect(q.get("min_score")).toBe("70");
    expect(q.getAll("work_mode")).toEqual(["hybrid", "remote"]);
    expect(q.getAll("level")).toEqual(["senior"]);
    expect(q.getAll("employment_type")).toEqual(["full_time", "contract"]);
    expect(q.get("posted_within_days")).toBe("7");
    expect(q.get("limit")).toBe("20");
  });

  it("leaves out anything in the address it does not understand", async () => {
    nav.search = new URLSearchParams("mode=underwater&score=900&days=0&sort=oldest");
    renderFeed();
    await screen.findByText("Job 1");
    const q = lastFeedCall().query;
    expect(["work_mode", "min_score", "posted_within_days", "sort"].some((k) => q.has(k))).toBe(
      false,
    );
  });
});

describe("the search field", () => {
  it("waits a moment after the last key, then puts the words in the address", async () => {
    renderFeed();
    await screen.findByText("Job 1");
    vi.useFakeTimers();
    const box = screen.getByRole("searchbox", { name: "Search jobs" });
    fireEvent.change(box, { target: { value: "dev" } });
    fireEvent.change(box, { target: { value: "devops  engineer " } });
    expect(nav.replace).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SEARCH_DELAY_MS + 10);
    });
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/feed?q=devops%20engineer");
  });

  it("shows the words that are in the address, and follows the address when it changes", async () => {
    nav.search = new URLSearchParams("q=python");
    const view = renderFeed();
    const box = (await screen.findByRole("searchbox", { name: "Search jobs" })) as HTMLInputElement;
    expect(box.value).toBe("python");

    nav.search = new URLSearchParams("");
    view.rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <AppProviders>
          <FeedShell>
            <p>side</p>
          </FeedShell>
        </AppProviders>
      </NextIntlClientProvider>,
    );
    expect((screen.getByRole("searchbox", { name: "Search jobs" }) as HTMLInputElement).value).toBe(
      "",
    );
  });
});

describe("the filters panel", () => {
  it("offers work mode, level, job type, posted and minimum score", async () => {
    renderFeed();
    const panel = await openPanel();
    for (const legend of ["Work mode", "Level", "Job type", "Posted", "Minimum score"]) {
      expect(within(panel).getByText(legend)).toBeInTheDocument();
    }
    expect(within(panel).getByRole("button", { name: "Remote" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(panel).getAllByRole("button", { name: "Any" })).toHaveLength(2);
    expect(within(panel).queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("puts each choice in the address at once, keeping the status and the order", async () => {
    nav.search = new URLSearchParams("status=saved&sort=newest");
    renderFeed();
    const panel = await openPanel();

    fireEvent.click(within(panel).getByRole("button", { name: "Remote" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved&sort=newest&mode=remote");
    fireEvent.click(within(panel).getByRole("button", { name: "Senior" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved&sort=newest&level=senior");
    fireEvent.click(within(panel).getByRole("button", { name: "Internship" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved&sort=newest&type=internship");
    fireEvent.click(within(panel).getByRole("button", { name: "Last 7 days" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved&sort=newest&days=7");
    fireEvent.click(within(panel).getByRole("button", { name: "70 and up" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved&sort=newest&score=70");
  });

  it("allows several work modes and takes a choice back when it is pressed again", async () => {
    nav.search = new URLSearchParams("mode=remote");
    renderFeed();
    const panel = await openPanel();
    expect(within(panel).getByRole("button", { name: "Remote" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(within(panel).getByRole("button", { name: "Hybrid" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?mode=remote,hybrid");
    fireEvent.click(within(panel).getByRole("button", { name: "Remote" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed");
  });

  it("counts the groups that are on in the button, and Clear filters turns them all off", async () => {
    nav.search = new URLSearchParams(
      "status=applied&sort=newest&q=dev&mode=remote&score=60&days=1",
    );
    renderFeed();
    const button = await screen.findByRole("button", { name: /^Filters/ });
    expect(within(button).getByText("4")).toBeInTheDocument();
    expect(within(button).getByLabelText("4 filters on")).toBeInTheDocument();

    fireEvent.click(button);
    const panel = await screen.findByRole("dialog");
    fireEvent.click(within(panel).getByRole("button", { name: "Clear filters" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=applied&sort=newest");
  });
});

describe("when nothing matches", () => {
  it("says no job matches the filters and offers to clear them", async () => {
    items = [];
    nav.search = new URLSearchParams("status=saved&mode=remote&q=zzz");
    renderFeed();
    expect(await screen.findByText("No job matches these filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/feed?status=saved");
  });

  it("still says the plain thing for an empty status tab with no filter", async () => {
    items = [];
    nav.search = new URLSearchParams("status=rejected");
    renderFeed();
    expect(await screen.findByText("No jobs with this status.")).toBeInTheDocument();
  });
});

describe("opening a job from a filtered list", () => {
  it("keeps the status, the order and the filters in the job's address", async () => {
    nav.search = new URLSearchParams("status=saved&sort=newest&q=dev&level=senior");
    renderFeed();
    const link = await screen.findByRole("link", { name: /Job 1/ });
    expect(link).toHaveAttribute(
      "href",
      "/jobs/00000000-0000-4000-8000-000000000001?status=saved&sort=newest&q=dev&level=senior",
    );
  });
});

describe("in Arabic", () => {
  it("shows the search and the filters in Arabic", async () => {
    renderFeed("ar");
    expect(await screen.findByRole("searchbox", { name: "ابحث في الوظائف" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /^التصفية/ }));
    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("نمط العمل")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "عن بُعد" })).toBeInTheDocument();
  });
});

describe("the company logo", () => {
  const logo = (ui: React.ReactElement) => render(ui);

  it("shows the initial when there is no logo", () => {
    const { container } = logo(<CompanyLogo name="Acme" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-slot=company-logo]")).toHaveTextContent("A");
  });

  it("shows the image the source gave, with no referrer and a lazy load", () => {
    const { container } = logo(<CompanyLogo name="Acme" src="https://cdn.example.com/acme.png" />);
    const image = container.querySelector("img")!;
    expect(image).toHaveAttribute("src", "https://cdn.example.com/acme.png");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(image).toHaveAttribute("loading", "lazy");
  });

  it("falls back to the initial when the image does not load, and tries a new address again", () => {
    const { container, rerender } = logo(
      <CompanyLogo name="Acme" src="https://cdn.example.com/broken.png" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-slot=company-logo]")).toHaveTextContent("A");

    rerender(<CompanyLogo name="Acme" src="https://cdn.example.com/fixed.png" />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/fixed.png",
    );
  });

  it("is used for the logo of a job in the list", async () => {
    items = [summary(1, { company_logo_url: "https://cdn.example.com/c1.png" })];
    renderFeed();
    const row = (await screen.findByText("Job 1")).closest("li")!;
    expect(row.querySelector("img")).toHaveAttribute("src", "https://cdn.example.com/c1.png");
  });
});
