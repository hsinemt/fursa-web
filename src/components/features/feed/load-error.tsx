"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useCountdown } from "@/hooks/use-countdown";
import { useDescribeError } from "@/hooks/use-describe-error";
import { cn } from "@/lib/utils/cn";

/**
 * A failed load: the message in plain words with the code underneath, and a retry button.
 * A session problem (401, deleted account) sends the person to sign in; after a 429 the
 * message counts down and the retry waits for it.
 */
export function LoadError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry: () => void;
  className?: string;
}) {
  const t = useTranslations("feed");
  const errors = useTranslations("errors");
  const describe = useDescribeError();
  const handle = useApiErrorHandler();
  const info = describe(error);
  const left = useCountdown(info.action === "wait" ? info.retryAfterSeconds : null);
  const waiting = left > 0;

  useEffect(() => {
    void handle(error);
  }, [error, handle]);

  return (
    <div className={cn("flex flex-col items-start gap-3", className)}>
      <ErrorPanel
        className="w-full"
        message={waiting ? errors("rate_limited", { seconds: left }) : info.message}
        code={info.code}
      />
      <Button onClick={onRetry} disabled={waiting}>
        {waiting ? t("retryIn", { seconds: left }) : t("retry")}
      </Button>
    </div>
  );
}
