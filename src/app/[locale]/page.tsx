import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Placeholder. The real welcome page is built in the next step (feat/welcome). */
export default function HomePage() {
  const t = useTranslations("home");
  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-2xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("placeholder")}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button asChild variant="primary">
          <Link href="/feed">{t("openApp")}</Link>
        </Button>
        <LanguageSwitcher />
      </div>
    </main>
  );
}
