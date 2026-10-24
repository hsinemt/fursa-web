"use client";

import { useCallback, useRef, useState } from "react";
import { ENDPOINT_GROUPS, ENDPOINTS, endpointById } from "@/lib/dev/endpoints";
import { LOG_LIMIT, type LogLine } from "@/lib/dev/run";
import { CallLog, type LoggedCall } from "./call-log";
import { EndpointCard } from "./endpoint-card";
import { SessionPanel } from "./session-panel";

const QUICK = [endpointById("GET /v1/health/ready"), endpointById("GET /v1/me")];

/**
 * The dev console: a plain page that makes the API easy to try by hand. The session and its
 * countdown, the two calls that tell you if everything works (health and "who am I"), a card
 * for every endpoint, and the log of the last calls. English only, never built in production.
 */
export function DevConsole() {
  const [calls, setCalls] = useState<LoggedCall[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const nextId = useRef(1);

  const onLog = useCallback((line: LogLine) => {
    const entry = { ...line, id: nextId.current++ };
    setCalls((previous) => [entry, ...previous].slice(0, LOG_LIMIT));
  }, []);

  const onJobIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setJobIds((previous) => [...new Set([...ids, ...previous])].slice(0, 100));
  }, []);

  const quickIds = new Set(QUICK.map((item) => item.id));

  return (
    <div>
      <h1 className="font-heading text-xl">Dev console</h1>
      <p className="mt-2 max-w-prose text-slate">
        Try the Fursa API by hand. Plain and in English on purpose, and not part of a production
        build. Calls go through the same client and cookies as the app. Answers are shown as
        returned; the log keeps only the method, route, status and time.
      </p>

      <div className="mt-6 gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <SessionPanel />

          <section aria-labelledby="quick-title">
            <h2 id="quick-title" className="mb-3 text-md">
              Does everything work?
            </h2>
            <div className="space-y-3">
              {QUICK.map((item) => (
                <EndpointCard
                  key={item.id}
                  endpoint={item}
                  defaultOpen
                  autoRun
                  jobIds={jobIds}
                  onLog={onLog}
                  onJobIds={onJobIds}
                />
              ))}
            </div>
          </section>

          {ENDPOINT_GROUPS.map((group) => {
            const items = ENDPOINTS.filter(
              (item) => item.group === group && !quickIds.has(item.id),
            );
            if (items.length === 0) return null;
            return (
              <section key={group} aria-label={group}>
                <h2 className="mb-3 text-md">{group}</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <EndpointCard
                      key={item.id}
                      endpoint={item}
                      jobIds={jobIds}
                      onLog={onLog}
                      onJobIds={onJobIds}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="mt-8 lg:sticky lg:top-6 lg:mt-0 lg:self-start">
          <CallLog calls={calls} onClear={() => setCalls([])} />
        </aside>
      </div>
    </div>
  );
}
