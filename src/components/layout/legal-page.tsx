import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { ICON_SM, iconProps } from "@/components/ui/icon";

type Section = { heading: string; text?: string[]; items?: string[] };

/**
 * The privacy and terms pages: a title, the date, a quiet draft note, then sections of plain
 * text (paragraphs and lists), set for reading (about 72 characters per line). The words come
 * from the messages, in all three languages.
 */
export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const t = useTranslations("legal");
  const sections = t.raw(`${kind}.sections`) as Section[];
  // Optional: an address for questions, set by the person who runs the site.
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl">{t(`${kind}.title`)}</h1>
      <p className="mt-2 text-sm text-slate">{t("updated")}</p>
      <p className="mt-4 flex items-start gap-2 rounded-panel bg-panel p-3 text-sm text-slate">
        <Info className="mt-0.5 shrink-0" width={ICON_SM} height={ICON_SM} {...iconProps} />
        {t("draft")}
      </p>
      <p className="mt-6 max-w-[72ch] text-md">{t(`${kind}.intro`)}</p>

      <div className="mt-8 flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.heading} className="border-t border-line pt-6">
            <h2 className="text-md">{section.heading}</h2>
            <div className="mt-3 flex max-w-[72ch] flex-col gap-3 text-base">
              {section.text?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 ps-5 marker:text-slate">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
        {contact ? (
          <section className="border-t border-line pt-6">
            <h2 className="text-md">{t("contactLabel")}</h2>
            <p className="mt-3 text-base">
              {t("contactLine")}
              <a href={`mailto:${contact}`} dir="ltr" className="inline-link text-accent">
                {contact}
              </a>
            </p>
          </section>
        ) : null}
      </div>
    </article>
  );
}
