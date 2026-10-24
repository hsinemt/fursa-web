"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Endpoint } from "@/lib/dev/endpoints";
import { jobIdsFrom, runEndpoint, toLogLine, type LogLine, type RunResult } from "@/lib/dev/run";
import { ResponseView } from "./response-view";

type Props = {
  endpoint: Endpoint;
  defaultOpen?: boolean;
  /** Send once when the card appears. */
  autoRun?: boolean;
  /** Job ids seen in feed answers, offered to the job endpoints. */
  jobIds: readonly string[];
  onLog: (line: LogLine) => void;
  onJobIds: (ids: string[]) => void;
};

/**
 * One endpoint: its inputs (path, query, JSON body), a Send button, and the answer. A call
 * that destroys data asks for a typed word first. After a 429 the button waits out the
 * seconds the API asked for.
 */
export function EndpointCard({ endpoint, defaultOpen, autoRun, jobIds, onLog, onJobIds }: Props) {
  const uid = useId();
  const [path, setPath] = useState<Record<string, string>>({});
  const [query, setQuery] = useState<Record<string, string>>({});
  const [body, setBody] = useState(endpoint.body ?? "");
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [wait, setWait] = useState(0);
  const autoRan = useRef(false);

  // Count the wait of a 429 down, one second at a time.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const needsConfirm = endpoint.confirmWord !== undefined && confirm !== endpoint.confirmWord;

  const send = useCallback(async () => {
    setRunning(true);
    const outcome = await runEndpoint(endpoint, { path, query, body }, api);
    setResult(outcome);
    if (outcome.sent) {
      onLog(toLogLine(endpoint, outcome, Date.now()));
      onJobIds(jobIdsFrom(outcome.body));
      if (outcome.error?.retryAfterSeconds) setWait(outcome.error.retryAfterSeconds);
    }
    setRunning(false);
  }, [endpoint, path, query, body, onLog, onJobIds]);

  useEffect(() => {
    if (autoRun && !autoRan.current) {
      autoRan.current = true;
      void send();
    }
  }, [autoRun, send]);

  const nextCursor =
    result?.sent &&
    result.ok &&
    typeof result.body === "object" &&
    result.body !== null &&
    "next_cursor" in result.body
      ? ((result.body as { next_cursor: unknown }).next_cursor as string | null)
      : null;

  const disabled = running || wait > 0 || needsConfirm;

  return (
    <details open={defaultOpen} className="group rounded-panel border border-line bg-panel">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="tabular w-16 shrink-0 text-sm font-medium text-accent">
          {endpoint.method}
        </span>
        <span className="tabular min-w-0 break-all text-ink">{endpoint.path}</span>
        {result?.sent ? (
          <span className="tabular ms-auto text-sm text-slate">
            {result.status === 0 ? "no answer" : result.status} · {result.ms} ms
          </span>
        ) : null}
      </summary>

      <div className="space-y-4 border-t border-line px-4 py-4">
        <p className="text-slate">{endpoint.summary}</p>
        {!endpoint.needsLogin ? null : (
          <p className="text-xs text-slate">
            Needs a signed-in session (the cookie is sent for you).
          </p>
        )}

        {endpoint.pathParams?.map((param) => {
          const id = `${uid}-path-${param.name}`;
          const listId = `${id}-list`;
          return (
            <div key={param.name} className="flex flex-col gap-1">
              <Label htmlFor={id}>{param.name}</Label>
              <Input
                id={id}
                list={jobIds.length > 0 ? listId : undefined}
                value={path[param.name] ?? ""}
                placeholder={param.hint}
                onChange={(event) => setPath({ ...path, [param.name]: event.target.value })}
                dir="ltr"
              />
              {jobIds.length > 0 ? (
                <datalist id={listId}>
                  {jobIds.map((jobId) => (
                    <option key={jobId} value={jobId} />
                  ))}
                </datalist>
              ) : (
                <p className="text-xs text-slate">
                  Send GET /v1/feed first: its job ids are offered here.
                </p>
              )}
            </div>
          );
        })}

        {endpoint.query?.map((field) => {
          const id = `${uid}-query-${field.name}`;
          return (
            <div key={field.name} className="flex flex-col gap-1">
              <Label htmlFor={id}>{field.name}</Label>
              {field.kind === "select" ? (
                <select
                  id={id}
                  value={query[field.name] ?? ""}
                  onChange={(event) => setQuery({ ...query, [field.name]: event.target.value })}
                  className="h-10 rounded-control border border-control bg-panel px-3 text-base text-ink"
                >
                  <option value="">(any)</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  inputMode={field.kind === "number" ? "numeric" : undefined}
                  value={query[field.name] ?? ""}
                  placeholder={field.hint}
                  onChange={(event) => setQuery({ ...query, [field.name]: event.target.value })}
                  dir="ltr"
                />
              )}
              <p className="text-xs text-slate">{field.hint}</p>
            </div>
          );
        })}

        {endpoint.body !== undefined ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${uid}-body`}>JSON body</Label>
            <textarea
              id={`${uid}-body`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={Math.min(14, body.split("\n").length + 1)}
              spellCheck={false}
              dir="ltr"
              className="w-full rounded-control border border-control bg-panel p-3 text-sm text-ink"
            />
            {endpoint.bodyHelp ? <p className="text-xs text-slate">{endpoint.bodyHelp}</p> : null}
          </div>
        ) : null}

        {endpoint.confirmWord !== undefined ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${uid}-confirm`}>Type {endpoint.confirmWord} to allow this call</Label>
            <Input
              id={`${uid}-confirm`}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              dir="ltr"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={endpoint.confirmWord ? "destructive" : "primary"}
            onClick={() => void send()}
            disabled={disabled}
          >
            {running ? "Sending…" : wait > 0 ? `Wait ${wait} s` : "Send"}
          </Button>
          {nextCursor ? (
            <Button variant="secondary" onClick={() => setQuery({ ...query, cursor: nextCursor })}>
              Use next_cursor
            </Button>
          ) : null}
        </div>

        {result ? <ResponseView result={result} wait={wait} /> : null}
      </div>
    </details>
  );
}
