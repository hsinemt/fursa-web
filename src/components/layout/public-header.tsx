import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { DoubleRule, Masthead } from "./masthead";

const NAV = [
  { href: "#how", key: "how" },
  { href: "#example", key: "example" },
  { href: "#services", key: "services" },
  { href: "#faq", key: "faq" },
] as const;

/**
 * Top of the public pages: the dual-script masthead, links to the sections of the welcome
 * page (laptop only), then language, appearance and Sign in, all above a double rule.
 * Create account is in the page.
 */
export function PublicHeader({ themeControl }: { themeControl: React.ReactNode }) {
  const t = useTranslations("welcome.nav");
  const actions = useTranslations("actions");

  return (
    <header className="bg-page">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center gap-6">
          <Masthead />
          <nav aria-label={t("how")} className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ href, key }) => (
              <a
                key={key}
                href={href}
                className="rounded-control px-3 py-2 text-slate hover:text-ink"
              >
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
        </div>
        <DoubleRule />
      </div>
    </header>
  );
}
