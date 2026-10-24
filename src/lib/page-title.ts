import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

/**
 * The `generateMetadata` of a page that only needs a title: the translated `title` of a
 * messages namespace. The layout adds " · Fursa".
 *
 *   export const generateMetadata = pageTitle("pages.pipeline");
 */
export function pageTitle(namespace: string, key = "title") {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) return {};
    // next-intl types its keys; the namespace here is chosen by each page, so they are cast once.
    const t = (await getTranslations({ locale, namespace } as never)) as unknown as (
      key: string,
    ) => string;
    return { title: t(key) };
  };
}
