import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { Masthead } from "./masthead";
import { StickyHeader } from "./sticky-header";

const NAV = [
  { href: "#how", key: "how" },
  { href: "#example", key: "example" },
  { href: "#services", key: "services" },
  { href: "#faq", key: "faq" },
] as const;

/**
 * Header of the public pages: a floating bar that stays on screen while scrolling, with the
 * dual-script masthead, links to the sections of the welcome page (laptop only), then
 * language, appearance and Sign in. Create account is in the page.
 */
export function PublicHeader({ themeControl }: { themeControl: React.ReactNode }) {
  const t = useTranslations("welcome.nav");
  const actions = useTranslations("actions");

  return (
    <StickyHeader>
      <Masthead />
      <nav aria-label={t("how")} className="hidden items-center gap-1 lg:flex">
        {NAV.map(({ href, key }) => (
          <a key={key} href={href} className="rounded-control px-3 py-2 text-slate hover:text-ink">
            {t(key)}
          </a>
        ))}
      </nav>
      <div className="ms-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        {themeControl}
        <Button asChild>
          <Link href="/login">{actions("signIn")}</Link>
        </Button>
      </div>
    </StickyHeader>
  );
}
