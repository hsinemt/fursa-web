"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import type { RunResult } from "@/lib/dev/run";

/** Responses longer than this are cut on screen (the download has everything). */
const SHOWN_CHARS = 20_000;

function statusText(status: number) {
  return status === 0 ? "No answer" : String(status);
}

/**
 * The answer of one call: the status and the time, then the JSON as returned, or the error
 * (code, message, details). A 429 shows how long to wait.
 */
export function ResponseView({ result, wait }: { result: RunResult; wait: number }) {
  const text = useMemo(() => {
    if (!result.sent) return "";
    return result.body === null ? "" : JSON.stringify(result.body, null, 2);
  }, [result]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "response.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!result.sent) {
    return <ErrorPanel message={result.error.message} code={result.error.code} />;
  }

  const { error } = result;
  const telegramLink =
    typeof result.body === "object" && result.body !== null && "url" in result.body
      ? String((result.body as { url: unknown }).url)
      : null;
  const details =
    error?.details === null || error?.details === undefined
      ? ""
      : JSON.stringify(error.details, null, 2);

  return (
    <div className="space-y-3">
      <p className="tabular text-sm text-slate">
        <span className="font-medium text-ink">{statusText(result.status)}</span> · {result.ms} ms
      </p>

      {error ? (
        <div className="space-y-2">
          <ErrorPanel
            message={error.message}
            code={`${error.code} (HTTP ${statusText(error.status)})`}
          />
          {error.action === "wait" ? (
            <p role="status" className="text-sm text-ink">
              {wait > 0
                ? `Too many requests. Wait ${wait} second${wait === 1 ? "" : "s"}, then send again.`
                : "The wait is over. You can send again."}
            </p>
          ) : null}
          {details ? (
            <div>
              <p className="mb-1 text-xs text-slate">details</p>
              <pre className="max-h-64 overflow-auto rounded-control border border-line bg-panel p-3 text-xs">
                {details}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {!error && telegramLink?.startsWith("https://t.me/") ? (
        <p className="text-sm">
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link text-accent underline"
          >
            Open the Telegram link
          </a>{" "}
          <span className="text-slate">(valid for 15 minutes)</span>
        </p>
      ) : null}

      {text ? (
        <div>
          <p className="mb-1 flex items-center justify-between gap-3 text-xs text-slate">
            <span>{error ? "error body" : "response body"}</span>
            <span className="tabular">{text.length.toLocaleString("en")} characters</span>
          </p>
          <pre className="max-h-96 overflow-auto rounded-control border border-line bg-panel p-3 text-xs">
            {text.length > SHOWN_CHARS
              ? `${text.slice(0, SHOWN_CHARS)}\n… cut here, download for all of it`
              : text}
          </pre>
          {text.length > SHOWN_CHARS ? (
            <Button variant="secondary" className="mt-2" onClick={download}>
              Download the whole response
            </Button>
          ) : null}
        </div>
      ) : !error ? (
        <p className="text-sm text-slate">No body (this answer has none).</p>
      ) : null}
    </div>
  );
}
