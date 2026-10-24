import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { BrandPanel } from "@/components/features/auth/brand-panel";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Masthead } from "@/components/layout/masthead";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { Link } from "@/i18n/navigation";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/**
 * Sign in, sign up and password pages: a split screen. The accent panel (laptop only) sits
 * on the start side and swaps sides in Arabic; the form is centered on the other side.
 * See "Auth pages" in fursa design.md.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const footer = await getTranslations("footer");

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-2">
      <BrandPanel />

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 px-4 py-4 sm:px-8">
          <Masthead className="lg:hidden" />
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeCycle current={theme} />
          </div>
        </header>

        <main id="main" className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <footer className="flex items-center gap-6 px-4 py-6 text-sm text-slate sm:px-8">
          <Link href="/privacy" className="hover:text-ink">
            {footer("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {footer("terms")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
