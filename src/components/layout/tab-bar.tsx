"use client";

import { useTranslations } from "next-intl";
import { ICON_MD, iconProps } from "@/components/ui/icon";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { isCurrentNav, NAV_ITEMS } from "./nav-items";

/**
 * Phone: a bottom tab bar with the four items, easy to reach with a thumb.
 * Flat, white (--panel), with a hairline above. Hidden from tablet width up.
 * Language and appearance live under Settings on phones.
 */
export function TabBar() {
  const t = useTranslations("nav");
  const a11y = useTranslations("a11y");
  const pathname = usePathname();

  return (
    <nav
      aria-label={a11y("mainNavigation")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const current = isCurrentNav(href, pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 px-1 text-xs",
                  current ? "border-accent text-accent" : "border-transparent text-slate",
                )}
              >
                <Icon width={ICON_MD} height={ICON_MD} {...iconProps} />
                <span className="max-w-full truncate">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
