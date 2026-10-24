import { Columns3, List, SlidersHorizontal, User, type LucideIcon } from "lucide-react";

export type NavKey = "feed" | "pipeline" | "profile" | "settings";

/** Documents is added when the API supports it. */
export const NAV_ITEMS: readonly { key: NavKey; href: `/${NavKey}`; icon: LucideIcon }[] = [
  { key: "feed", href: "/feed", icon: List },
  { key: "pipeline", href: "/pipeline", icon: Columns3 },
  { key: "profile", href: "/profile", icon: User },
  { key: "settings", href: "/settings", icon: SlidersHorizontal },
];
