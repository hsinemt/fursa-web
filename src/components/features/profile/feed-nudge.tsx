"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { useProfile } from "@/lib/profile/hooks";

/**
 * Shown on the feed while the profile has no target roles: nothing can be matched yet, so
 * the page says so and offers the one next step. Renders nothing while loading or when
 * the roles exist (the feed itself arrives in a later step).
 */
export function FeedNudge() {
  const t = useTranslations("emptyFeed");
  const profile = useProfile();
  if (!profile.data || profile.data.target_roles.length > 0) return null;
  return (
    <EmptyState
      className="mt-8"
      title={t("title")}
      description={t("text")}
      action={
        <Button asChild variant="primary">
          <Link href="/profile">{t("action")}</Link>
        </Button>
      }
    />
  );
}
