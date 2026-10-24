import { Columns3, List, SlidersHorizontal, User, type LucideIcon } from "lucide-react";

export type NavKey = "feed" | "pipeline" | "profile" | "settings";

/** Documents is added when the API supports it. */
export const NAV_ITEMS: readonly { key: NavKey; href: `/${NavKey}`; icon: LucideIcon }[] = [
  { key: "feed", href: "/feed", icon: List },
  { key: "pipeline", href: "/pipeline", icon: Columns3 },
  { key: "profile", href: "/profile", icon: User },
  { key: "settings", href: "/settings", icon: SlidersHorizontal },
];

/** Whether a nav item is the current page. A job (/jobs/<id>) belongs to the feed. */
export function isCurrentNav(href: string, pathname: string): boolean {
  const own = pathname === href || pathname.startsWith(`${href}/`);
  return own || (href === "/feed" && pathname.startsWith("/jobs/"));
}

/**
 * What the top bar shows: the two work screens. Profile and Settings are in the account menu
 * there (see "Account menu" in fursa design.md). The phone tab bar shows all of NAV_ITEMS.
 */
export const TOP_BAR_ITEMS = NAV_ITEMS.filter(({ key }) => key === "feed" || key === "pipeline");
