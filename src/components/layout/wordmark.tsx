import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/** "Fursa" in Plex Serif 500, "فرصة" in Plex Sans Arabic 500. No icon, until there is a logo. */
export function Wordmark({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <Link href="/" className={cn("font-heading text-lg font-medium text-ink", className)}>
      {t("brand")}
    </Link>
  );
}
