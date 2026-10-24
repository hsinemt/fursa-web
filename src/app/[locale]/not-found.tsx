import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-xl">{t("title")}</h1>
      <p className="mt-2 text-slate">{t("help")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("back")}</Link>
      </Button>
    </main>
  );
}
