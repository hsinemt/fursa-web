"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { LanguageSwitcher } from "./language-switcher";
import { isCurrentNav, TOP_BAR_ITEMS } from "./nav-items";
import { Wordmark } from "./wordmark";

/**
 * Tablet and laptop: a thin top bar. Wordmark, Feed and Job tracker (the current one has a
 * 2 px accent underline), then language and appearance on the far side.
 * Hidden on phones, where the bottom tab bar takes over.
 */
export function TopBar({
  themeControl,
  accountControl,
}: {
  themeControl?: React.ReactNode;
  accountControl?: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const a11y = useTranslations("a11y");
  const pathname = usePathname();

  return (
    <header className="hidden border-b border-line bg-panel sm:block">
      <div className="flex h-14 w-full items-stretch gap-6 px-6">
        <Wordmark className="flex items-center" />
        <nav aria-label={a11y("mainNavigation")} className="flex items-stretch gap-1">
          {TOP_BAR_ITEMS.map(({ key, href }) => {
            const current = isCurrentNav(href, pathname);
            return (
              <Link
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center border-b-2 px-3 text-base",
                  current
                    ? "border-accent text-ink"
                    : "border-transparent text-slate hover:text-ink",
                )}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher syncAccount />
          {themeControl}
          {accountControl}
        </div>
      </div>
    </header>
  );
}
