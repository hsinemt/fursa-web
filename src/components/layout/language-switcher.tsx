"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/**
 * Switches the interface language, keeping the current page.
 * - "select": compact, for the top bar
 * - "list": all three languages visible, for Settings
 */
export function LanguageSwitcher({ variant = "select" }: { variant?: "select" | "list" }) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    startTransition(() => {
      // `params` is passed for dynamic routes such as /jobs/[id].
      router.replace({ pathname, params } as Parameters<typeof router.replace>[0], {
        locale: next,
      });
    });
  }

  if (variant === "list") {
    return (
      <div role="group" aria-label={t("label")} className="flex flex-wrap gap-2">
        {locales.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={code === locale}
            disabled={pending}
            onClick={() => change(code)}
            className={cn(
              "h-10 rounded-control border px-4 text-base pointer-coarse:h-11",
              code === locale
                ? "border-accent bg-tint text-accent"
                : "border-control bg-transparent text-ink hover:bg-tint",
            )}
          >
            {t(code)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      aria-label={t("label")}
      value={locale}
      disabled={pending}
      onChange={(event) => change(event.target.value as Locale)}
      className="h-10 rounded-control border border-control bg-panel px-2 text-sm text-ink pointer-coarse:h-11"
    >
      {locales.map((code) => (
        <option key={code} value={code} lang={code}>
          {t(code)}
        </option>
      ))}
    </select>
  );
}
