"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { refreshSession } from "@/lib/auth/actions";
import { getSessionInfo, type SessionInfo } from "@/lib/auth/session-info";

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  return `${minutes}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The session as the server sees it. The access token is HttpOnly, so the browser cannot read
 * when it expires: a Server Action says it (never the token). The countdown runs here, and the
 * button refreshes the session for real: both cookies change together.
 */
export function SessionPanel() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setInfo(await getSessionInfo());
  }, []);

  useEffect(() => {
    let active = true;
    void getSessionInfo().then((value) => {
      if (active) setInfo(value);
    });
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function refresh() {
    setBusy(true);
    setNote(null);
    const ok = await refreshSession();
    await load();
    setNote(
      ok
        ? "Session refreshed: both cookies were rewritten."
        : "The refresh failed: the session was cleared. Sign in again.",
    );
    setBusy(false);
  }

  const remaining = info?.expiresAt ? info.expiresAt - now : null;

  return (
    <section
      aria-labelledby="session-title"
      className="rounded-panel border border-line bg-panel p-4"
    >
      <h2 id="session-title" className="text-md">
        Session
      </h2>

      {info === null ? (
        <p className="mt-2 text-slate">Reading the session…</p>
      ) : !info.configured ? (
        <p className="mt-2 text-slate">
          Sign-in is not set up on this server (SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY).
        </p>
      ) : !info.signedIn ? (
        <p className="mt-2 text-slate">No session. Sign in again.</p>
      ) : (
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate">Signed in as</dt>
            <dd dir="ltr" className="text-start text-ink">
              {info.email ?? "(no email)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Access token</dt>
            <dd className="tabular text-ink" aria-live="off">
              {remaining === null
                ? "no expiry known"
                : remaining > 0
                  ? `expires in ${clock(remaining)}`
                  : "expired (the next call refreshes it once)"}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          disabled={busy || !info?.signedIn}
        >
          {busy ? "Refreshing…" : "Refresh the token"}
        </Button>
        <Button variant="ghost" onClick={() => void load()} disabled={busy}>
          Reload
        </Button>
      </div>
      {note ? (
        <p role="status" className="mt-3 text-sm text-ink">
          {note}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate">
        The token lives about an hour. When the API answers token_expired, the client refreshes the
        session once and sends the call again.
      </p>
    </section>
  );
}
