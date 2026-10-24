import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { Wordmark } from "./wordmark";

/**
 * Top bar of the public pages: wordmark, links to the sections of the welcome page
 * (laptop only), then language, appearance and Sign in. Create account is in the page.
 */
export function PublicHeader({ themeControl }: { themeControl: React.ReactNode }) {
  const t = useTranslations("welcome.nav");
  const actions = useTranslations("actions");

  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-6 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label={t("how")} className="hidden items-center gap-1 lg:flex">
          <a href="#how" className="rounded-control px-3 py-2 text-slate hover:text-ink">
            {t("how")}
          </a>
          <a href="#example" className="rounded-control px-3 py-2 text-slate hover:text-ink">
            {t("example")}
          </a>
          <a href="#data" className="rounded-control px-3 py-2 text-slate hover:text-ink">
            {t("data")}
          </a>
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
    </header>
  );
}
