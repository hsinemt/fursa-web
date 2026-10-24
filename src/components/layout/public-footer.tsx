import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { Wordmark } from "./wordmark";

/** Footer of the public pages: privacy and terms links, and the language switcher. */
export function PublicFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-16 border-t border-line bg-panel">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <nav aria-label={t("privacy")} className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate hover:text-ink">
              {t("privacy")}
            </Link>
            <Link href="/terms" className="text-slate hover:text-ink">
              {t("terms")}
            </Link>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate">{t("language")}</span>
          <LanguageSwitcher variant="list" />
        </div>
      </div>
    </footer>
  );
}
