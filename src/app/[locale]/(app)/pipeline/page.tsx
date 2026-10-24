import { useTranslations } from "next-intl";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function PipelinePage() {
  const t = useTranslations("pages.pipeline");
  return <PlaceholderPage title={t("title")} description={t("placeholder")} />;
}
