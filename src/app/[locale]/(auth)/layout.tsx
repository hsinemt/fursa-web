import { cookies } from "next/headers";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Masthead } from "@/components/layout/masthead";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** Sign in, sign up and password pages: the masthead, language and appearance above the form. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Masthead />
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeCycle current={theme} />
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
