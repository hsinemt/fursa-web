import { useTranslations } from "next-intl";
import { PlaceholderPage } from "./placeholder-page";

/** A simple page that stands in until its own step is built (sign in, privacy...). */
export function LaterPage({ page }: { page: "login" | "signup" | "privacy" | "terms" }) {
  const t = useTranslations("later");
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <PlaceholderPage title={t(page)} description={t("placeholder")} />
    </div>
  );
}
