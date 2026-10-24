"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * What a person sees when a page breaks: one calm sentence, the way to try again and the way
 * out. The technical digest (an id, never the error text) is shown small for support.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("help")}</p>
      {error.digest ? <p className="tabular mt-3 text-xs text-slate">{error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={reset}>
          {t("retry")}
        </Button>
        <Button asChild>
          <Link href="/feed">{t("back")}</Link>
        </Button>
      </div>
    </main>
  );
}
