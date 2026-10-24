import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { ICON_MD, iconProps } from "@/components/ui/icon";

const QUESTIONS = ["how", "sources", "alerts", "apply", "data", "languages"] as const;

/** Questions as ruled rows (native details elements: keyboard and screen reader friendly). */
export function Faq() {
  const t = useTranslations("welcome.faq.items");

  return (
    <div className="divide-y divide-line border-y border-line">
      {QUESTIONS.map((key) => (
        <details key={key} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-md font-medium text-ink [&::-webkit-details-marker]:hidden">
            {t(`${key}.q`)}
            <ChevronDown
              width={ICON_MD}
              height={ICON_MD}
              className="shrink-0 text-slate transition-transform duration-150 ease-out group-open:rotate-180"
              {...iconProps}
            />
          </summary>
          <p className="max-w-prose pb-4 text-slate">{t(`${key}.a`)}</p>
        </details>
      ))}
    </div>
  );
}
