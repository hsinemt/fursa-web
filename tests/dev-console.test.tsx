import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DevConsole } from "@/components/dev/console";
import { EndpointCard } from "@/components/dev/endpoint-card";
import { SessionPanel } from "@/components/dev/session-panel";
import { endpointById } from "@/lib/dev/endpoints";

const net = vi.hoisted(() => ({ fetch: vi.fn() }));
const auth = vi.hoisted(() => ({ refreshSession: vi.fn(), getSessionInfo: vi.fn() }));

vi.mock("@/lib/api", async () => {
  const { createApiClient } = await import("@/lib/api/client");
  return {
    api: createApiClient({
      baseUrl: "http://api.test",
      fetch: ((request: Request) => net.fetch(request)) as unknown as typeof fetch,
    }),
  };
});
vi.mock("@/lib/auth/actions", () => ({ refreshSession: auth.refreshSession }));
vi.mock("@/lib/auth/session-info", () => ({ getSessionInfo: auth.getSessionInfo }));

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const noop = () => {};
const cardProps = { jobIds: [] as string[], onLog: noop, onJobIds: noop };

function card(id: string, extra: Partial<React.ComponentProps<typeof EndpointCard>> = {}) {
  return render(<EndpointCard endpoint={endpointById(id)} defaultOpen {...cardProps} {...extra} />);
}

const send = () => fireEvent.click(screen.getByRole("button", { name: "Send" }));

beforeEach(() => {
  net.fetch.mockReset();
  auth.refreshSession.mockReset();
  auth.getSessionInfo.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("EndpointCard", () => {
  it("sends the call and shows the status, the time and the JSON as returned", async () => {
    net.fetch.mockResolvedValue(json(200, { id: "u1", email: "a@b.co", locale: "en" }));
    const onLog = vi.fn();
    card("GET /v1/me", { onLog });
    send();

    expect(await screen.findByText("response body")).toBeInTheDocument();
    expect(screen.getByText(/"email": "a@b.co"/)).toBeInTheDocument();
    expect(screen.getAllByText(/ms/).length).toBeGreaterThan(0);
    expect(onLog).toHaveBeenCalledTimes(1);
    expect(onLog.mock.calls[0]?.[0]).toMatchObject({
      method: "GET",
      path: "/v1/me",
      status: 200,
      code: null,
    });
    expect(JSON.stringify(onLog.mock.calls[0]?.[0])).not.toContain("a@b.co");
  });

  it("sends once on its own when asked (the quick checks)", async () => {
    net.fetch.mockResolvedValue(json(200, { status: "ok", checks: {} }));
    card("GET /v1/health/ready", { autoRun: true });
    await screen.findByText("response body");
    expect(net.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows an API error with its code, message and details", async () => {
    net.fetch.mockResolvedValue(
      json(422, {
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: [{ loc: ["body", "locale"], msg: "not allowed" }],
        },
      }),
    );
    card("PATCH /v1/settings");
    send();

    expect(await screen.findByRole("alert")).toHaveTextContent("Request validation failed");
    expect(screen.getByRole("alert")).toHaveTextContent("validation_error (HTTP 422)");
    // The details are shown on their own, and again inside the error body as returned.
    expect(screen.getByText("details")).toBeInTheDocument();
    expect(screen.getAllByText(/"msg": "not allowed"/).length).toBeGreaterThanOrEqual(1);
  });

  it("refuses a body that is not JSON, and does not call the API", async () => {
    card("PATCH /v1/settings");
    fireEvent.change(screen.getByLabelText("JSON body"), { target: { value: '{"locale": ' } });
    send();

    expect(await screen.findByRole("alert")).toHaveTextContent("The body is not valid JSON");
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it("a 429 waits out the seconds the API asked for, then lets you send again", async () => {
    vi.useFakeTimers();
    net.fetch.mockResolvedValue(
      json(
        429,
        {
          error: { code: "rate_limited", message: "Too many", details: { retry_after_seconds: 3 } },
        },
        { "retry-after": "3" },
      ),
    );
    card("GET /v1/me");
    send();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const waiting = screen.getByRole("button", { name: "Wait 3 s" });
    expect(waiting).toBeDisabled();
    expect(screen.getByText(/Wait 3 seconds, then send again/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("button", { name: "Wait 2 s" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("button", { name: "Wait 1 s" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
    expect(screen.getByText("The wait is over. You can send again.")).toBeInTheDocument();
  });

  it("feed: offers next_cursor, and the next call carries it; job ids are collected", async () => {
    net.fetch
      .mockResolvedValueOnce(
        json(200, { items: [{ id: "job-1" }, { id: "job-2" }], next_cursor: "page-2" }),
      )
      .mockResolvedValueOnce(json(200, { items: [], next_cursor: null }));
    const onJobIds = vi.fn();
    card("GET /v1/feed", { onJobIds });
    send();

    fireEvent.click(await screen.findByRole("button", { name: "Use next_cursor" }));
    expect(screen.getByLabelText("cursor")).toHaveValue("page-2");
    expect(onJobIds).toHaveBeenCalledWith(["job-1", "job-2"]);

    send();
    await waitFor(() => expect(net.fetch).toHaveBeenCalledTimes(2));
    const second = net.fetch.mock.calls[1]?.[0] as Request;
    expect(new URL(second.url).searchParams.get("cursor")).toBe("page-2");
  });

  it("job endpoints offer the job ids seen in the feed, and need an id", async () => {
    const { container } = card("GET /v1/jobs/{job_id}", { jobIds: ["job-1", "job-2"] });
    expect(container.querySelectorAll("datalist option")).toHaveLength(2);

    send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Fill in job_id first.");
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it("without known ids it says where to get them", () => {
    card("GET /v1/jobs/{job_id}");
    expect(screen.getByText(/Send GET \/v1\/feed first/)).toBeInTheDocument();
  });

  it("deleting the account needs the word DELETE typed first", async () => {
    net.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    card("DELETE /v1/account");

    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Type DELETE to allow this call"), {
      target: { value: "delete" },
    });
    expect(button).toBeDisabled(); // the exact word, in capitals

    fireEvent.change(screen.getByLabelText("Type DELETE to allow this call"), {
      target: { value: "DELETE" },
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(await screen.findByText("No body (this answer has none).")).toBeInTheDocument();
    expect(net.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows the Telegram link as a safe link, and only for t.me", async () => {
    net.fetch.mockResolvedValueOnce(
      json(200, { url: "https://t.me/FursaBot?start=abc", expires_in_seconds: 900 }),
    );
    const first = card("POST /v1/notifications/telegram/link");
    send();
    const link = await screen.findByRole("link", { name: "Open the Telegram link" });
    expect(link).toHaveAttribute("href", "https://t.me/FursaBot?start=abc");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    first.unmount();

    net.fetch.mockResolvedValueOnce(
      json(200, { url: "javascript:alert(1)", expires_in_seconds: 900 }),
    );
    card("POST /v1/notifications/telegram/link");
    send();
    await screen.findByText("response body");
    expect(screen.queryByRole("link", { name: "Open the Telegram link" })).toBeNull();
  });

  it("cuts a very long answer on screen and offers the whole thing as a download", async () => {
    const big = { items: Array.from({ length: 2000 }, (_, i) => ({ n: i, text: "x".repeat(20) })) };
    net.fetch.mockResolvedValue(json(200, big));
    card("GET /v1/account/export");
    send();

    expect(await screen.findByText(/cut here, download for all of it/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download the whole response" })).toBeInTheDocument();
  });
});

describe("SessionPanel", () => {
  const T0 = new Date("2026-01-01T00:00:00Z");
  const at = (seconds: number) => Math.floor(T0.getTime() / 1000) + seconds;

  it("shows who is signed in and a countdown to the end of the access token", async () => {
    vi.useFakeTimers({ now: T0 });
    auth.getSessionInfo.mockResolvedValue({
      configured: true,
      signedIn: true,
      expiresAt: at(125),
      email: "a@b.co",
    });
    render(<SessionPanel />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("a@b.co")).toBeInTheDocument();
    expect(screen.getByText("expires in 2:05")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText("expires in 2:00")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(121_000);
    });
    expect(screen.getByText(/^expired \(the next call/)).toBeInTheDocument();
  });

  it("refreshes the token for real, then reads the new expiry", async () => {
    vi.useFakeTimers({ now: T0 });
    auth.getSessionInfo
      .mockResolvedValueOnce({
        configured: true,
        signedIn: true,
        expiresAt: at(30),
        email: "a@b.co",
      })
      .mockResolvedValue({
        configured: true,
        signedIn: true,
        expiresAt: at(3600),
        email: "a@b.co",
      });
    auth.refreshSession.mockResolvedValue(true);
    render(<SessionPanel />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("expires in 0:30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh the token" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText("expires in 60:00")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("both cookies were rewritten");
  });

  it("says when the refresh failed and the session was cleared", async () => {
    auth.getSessionInfo.mockResolvedValue({
      configured: true,
      signedIn: true,
      expiresAt: at(30),
      email: "a@b.co",
    });
    auth.refreshSession.mockResolvedValue(false);
    render(<SessionPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Refresh the token" }));
    expect(await screen.findByRole("status", {}, { timeout: 4000 })).toHaveTextContent(
      "the session was cleared",
    );
  });

  it("says when sign-in is not set up, or there is no session", async () => {
    auth.getSessionInfo.mockResolvedValueOnce({
      configured: false,
      signedIn: false,
      expiresAt: null,
      email: null,
    });
    const first = render(<SessionPanel />);
    expect(await screen.findByText(/Sign-in is not set up on this server/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh the token" })).toBeDisabled();
    first.unmount();

    auth.getSessionInfo.mockResolvedValueOnce({
      configured: true,
      signedIn: false,
      expiresAt: null,
      email: null,
    });
    render(<SessionPanel />);
    expect(await screen.findByText("No session. Sign in again.")).toBeInTheDocument();
  });
});

describe("DevConsole", () => {
  beforeEach(() => {
    auth.getSessionInfo.mockResolvedValue({
      configured: true,
      signedIn: true,
      expiresAt: 4_102_444_800,
      email: "a@b.co",
    });
    net.fetch.mockImplementation(async (request: Request) =>
      request.url.endsWith("/v1/me")
        ? json(200, { id: "u1", email: "private@person.example", locale: "en" })
        : json(200, { status: "ok", checks: { database: "ok" } }),
    );
  });

  it("has a card for every group and checks health and 'who am I' on its own", async () => {
    render(<DevConsole />);

    expect(screen.getByRole("heading", { level: 1, name: "Dev console" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Does everything work?" })).toBeInTheDocument();
    for (const group of [
      "Health",
      "Profile",
      "Feed and jobs",
      "Settings",
      "Notifications",
      "Your data",
    ]) {
      expect(screen.getByRole("heading", { name: group })).toBeInTheDocument();
    }
    // "You" has only "who am I", which is already in the quick checks.
    expect(screen.queryByRole("heading", { name: "You" })).toBeNull();

    await waitFor(() => expect(net.fetch).toHaveBeenCalledTimes(2));
    const urls = net.fetch.mock.calls
      .map(([request]) => new URL((request as Request).url).pathname)
      .sort();
    expect(urls).toEqual(["/v1/health/ready", "/v1/me"]);
  });

  it("logs the calls with method, route, status and time, and no personal data", async () => {
    render(<DevConsole />);
    const log = screen.getByRole("region", { name: "Last calls" });

    await waitFor(() => expect(within(log).getAllByRole("listitem")).toHaveLength(2));
    expect(log).toHaveTextContent("GET 200");
    expect(log).toHaveTextContent("/v1/me");
    expect(log).toHaveTextContent("/v1/health/ready");
    expect(log).not.toHaveTextContent("private@person.example");
    expect(log).not.toHaveTextContent("a@b.co");
  });

  it("clears the log", async () => {
    render(<DevConsole />);
    const log = screen.getByRole("region", { name: "Last calls" });
    await waitFor(() => expect(within(log).getAllByRole("listitem")).toHaveLength(2));

    fireEvent.click(within(log).getByRole("button", { name: "Clear" }));
    expect(within(log).queryAllByRole("listitem")).toHaveLength(0);
    expect(log).toHaveTextContent("Nothing yet");
  });
});
