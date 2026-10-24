"use client";

import { Button } from "@/components/ui/button";
import type { LogLine } from "@/lib/dev/run";

export type LoggedCall = LogLine & { id: number };

function time(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

/**
 * The last calls: time, method, route, status, duration, and the error code of a failure.
 * Never a token, an email, an id, a query value or a response body.
 */
export function CallLog({ calls, onClear }: { calls: readonly LoggedCall[]; onClear: () => void }) {
  return (
    <section aria-labelledby="log-title" className="rounded-panel border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="log-title" className="text-md">
          Last calls
        </h2>
        <Button variant="ghost" onClick={onClear} disabled={calls.length === 0}>
          Clear
        </Button>
      </div>
      {calls.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate">
          Nothing yet. Send a call and it appears here.
        </p>
      ) : (
        <ol className="max-h-[32rem] divide-y divide-line overflow-auto">
          {calls.map((call) => (
            <li key={call.id} className="px-4 py-3 text-sm">
              <p className="flex items-baseline justify-between gap-3">
                <span className="tabular font-medium text-ink">
                  {call.method} {call.status === 0 ? "no answer" : call.status}
                </span>
                <span className="tabular text-slate">{call.ms} ms</span>
              </p>
              <p className="tabular mt-1 break-all text-slate">{call.path}</p>
              <p className="tabular mt-1 flex justify-between gap-3 text-xs text-slate">
                <span>{time(call.at)}</span>
                {call.code ? <span>{call.code}</span> : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
