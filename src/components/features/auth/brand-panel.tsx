import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Masthead } from "@/components/layout/masthead";
import { ICON_MD, iconProps } from "@/components/ui/icon";

const POINTS = ["apply", "data", "languages"] as const;

/**
 * The accent half of the sign-in and sign-up screens (laptop only): the masthead at the top,
 * and below it one text block centered in the panel and large: the headline aligned to the
 * start (justified display type leaves wide gaps), the paragraph justified like a text box.
 * Only words: no cards, images, logos or numbers about users (see "Auth pages" in
 * fursa design.md).
 */
export function BrandPanel() {
  const t = useTranslations("auth.panel");

  return (
    <aside className="hidden flex-col bg-accent p-12 text-on-accent lg:flex xl:p-16">
      <Masthead tone="inverse" />

      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-lg">
          <p className="font-heading text-[length:clamp(2.5rem,4.4vw,4.5rem)] leading-(--leading-display) text-balance text-start">
            {t("headline")}
          </p>
          <p className="mt-8 text-justify text-lg leading-relaxed">{t("text")}</p>

          <ul className="mt-10 space-y-4 text-start text-md">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <Check className="shrink-0" width={ICON_MD} height={ICON_MD} {...iconProps} />
                {t(`points.${point}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
