"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useCountdown } from "@/hooks/use-countdown";
import { useDescribeError } from "@/hooks/use-describe-error";
import { useLinkTelegram, useUnlinkTelegram } from "@/lib/notifications/hooks";
import { safeTelegramUrl } from "@/lib/notifications/values";
import { usePreferences, useUpdatePreferences, type Preferences } from "@/lib/profile/hooks";

type Link = { id: number; url: string; seconds: number };

/** The open link: the button, the countdown, and the check every 3 seconds until it is linked. */
function LinkPanel({ link, onAgain, busy }: { link: Link; onAgain: () => void; busy: boolean }) {
  const t = useTranslations("settings.telegram");
  const left = useCountdown(link.seconds);
  // Ask again every 3 seconds while the link is valid; the cache then updates the section above.
  usePreferences({ poll: left > 0 });

  if (left === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-slate">{t("expired")}</p>
        <Button onClick={onAgain} disabled={busy}>
          {t("link")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <Button asChild>
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          {t("open")}
          <ExternalLink width={ICON_SM} height={ICON_SM} {...iconProps} />
        </a>
      </Button>
      <p className="text-slate">{t("openHelp", { minutes: Math.ceil(left / 60) })}</p>
      <p role="status" className="flex items-center gap-2 text-sm text-slate">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
        {t("waiting")}
      </p>
    </div>
  );
}

/** Linking is outside this page (the chat), so everything here acts at once. */
export function TelegramSection({ prefs }: { prefs: Preferences }) {
  const t = useTranslations("settings.telegram");
  const toast = useToast();
  const describe = useDescribeError();
  const handle = useApiErrorHandler();
  const linkMutation = useLinkTelegram();
  const unlink = useUnlinkTelegram();
  const update = useUpdatePreferences();
  const checkId = useId();

  const [link, setLink] = useState<Link | null>(null);
  const [error, setError] = useState<unknown>(null);
  const next = useRef(0);

  // Say so once when the chat gets linked while the person is on this page.
  const wasLinked = useRef(prefs.telegram_linked);
  useEffect(() => {
    if (!wasLinked.current && prefs.telegram_linked) toast.show(t("linkedToast"));
    wasLinked.current = prefs.telegram_linked;
  }, [prefs.telegram_linked, toast, t]);

  function fail(failure: unknown) {
    setError(failure);
    void handle(failure);
  }

  function startLink() {
    setError(null);
    linkMutation.mutate(undefined, {
      onSuccess: (answer) => {
        const url = safeTelegramUrl(answer.url);
        if (!url) return fail(new Error("bad link"));
        setLink({ id: (next.current += 1), url, seconds: answer.expires_in_seconds });
      },
      onError: fail,
    });
  }

  const described = error ? describe(error) : null;

  return (
    <div className="flex flex-col gap-4">
      {prefs.telegram_linked ? (
        <>
          <p className="text-ink">{t("linked")}</p>
          <div className="flex items-center gap-3">
            <input
              id={checkId}
              type="checkbox"
              checked={prefs.telegram_enabled}
              disabled={update.isPending}
              onChange={(event) => {
                setError(null);
                update.mutate(
                  { telegram_enabled: event.target.checked },
                  { onSuccess: () => toast.show(t("saved")), onError: fail },
                );
              }}
              className="size-5 accent-accent"
            />
            <label htmlFor={checkId} className="text-base text-ink">
              {t("enabled")}
            </label>
          </div>
          <div>
            <Button
              variant="destructive"
              disabled={unlink.isPending}
              onClick={() => {
                setError(null);
                unlink.mutate(undefined, {
                  onSuccess: () => {
                    setLink(null);
                    toast.show(t("unlinkedToast"));
                  },
                  onError: fail,
                });
              }}
            >
              {t("unlink")}
            </Button>
          </div>
        </>
      ) : link ? (
        <LinkPanel link={link} onAgain={startLink} busy={linkMutation.isPending} />
      ) : (
        <>
          <p className="text-slate">{t("notLinked")}</p>
          <div>
            <Button onClick={startLink} disabled={linkMutation.isPending}>
              {t("link")}
            </Button>
          </div>
        </>
      )}
      {described ? <ErrorPanel message={described.message} code={described.code} /> : null}
    </div>
  );
}
