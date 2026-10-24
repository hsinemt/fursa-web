import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Masthead } from "@/components/layout/masthead";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { scoreBand } from "@/lib/utils/score";

const POINTS = ["apply", "data", "languages"] as const;
const SAMPLE_SCORE = 82;

/**
 * The accent half of the sign-in and sign-up screens (laptop only): the masthead, the promise,
 * a real example of a match with its reason, and three short facts. No logos, no numbers
 * about users, no testimonials: only what Fursa does (see "Auth pages" in fursa design.md).
 */
export function BrandPanel() {
  const t = useTranslations("auth.panel");
  const hero = useTranslations("welcome.hero");
  const score = useTranslations("score");

  return (
    <aside className="hidden flex-col justify-between gap-12 bg-accent p-12 text-on-accent lg:flex xl:p-16">
      <Masthead tone="inverse" />

      <div className="max-w-md">
        <p className="font-heading text-[length:clamp(2rem,3.4vw,3.25rem)] leading-(--leading-display) text-balance">
          {t("headline")}
        </p>
        <p className="mt-4 text-md">{t("text")}</p>

        <div className="mt-10 rounded-panel bg-panel p-6 text-ink">
          <p className="text-xs text-slate">{hero("tag")}</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="tabular font-heading text-2xl text-accent">{SAMPLE_SCORE}</span>
            <span className="text-sm text-slate">{score(scoreBand(SAMPLE_SCORE))}</span>
          </p>
          <p dir="auto" className="mt-1 font-medium">
            {hero("title")}
          </p>
          <p dir="auto" className="mt-2 text-slate">
            {hero("why")}
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-sm">
        {POINTS.map((point) => (
          <li key={point} className="flex items-center gap-3">
            <Check className="shrink-0" width={ICON_SM} height={ICON_SM} {...iconProps} />
            {t(`points.${point}`)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
