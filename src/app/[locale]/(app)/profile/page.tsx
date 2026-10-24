import { useTranslations } from "next-intl";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function ProfilePage() {
  const t = useTranslations("pages.profile");
  return <PlaceholderPage title={t("title")} description={t("placeholder")} />;
}
