import { useTranslations } from "next-intl";
import { FeedNudge } from "@/components/features/profile/feed-nudge";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function FeedPage() {
  const t = useTranslations("pages.feed");
  return (
    <PlaceholderPage title={t("title")} description={t("placeholder")}>
      <FeedNudge />
    </PlaceholderPage>
  );
}
