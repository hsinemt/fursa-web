import { cookies } from "next/headers";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** Public pages: welcome, privacy, terms. A header and a footer around the page. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <>
      <PublicHeader themeControl={<ThemeCycle current={theme} />} />
      <main id="main">{children}</main>
      <PublicFooter />
    </>
  );
}
