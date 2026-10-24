import { cookies } from "next/headers";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Masthead } from "@/components/layout/masthead";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { AppProviders } from "@/components/providers/app-providers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** Onboarding is one focused column: no navigation to wander off to. */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 px-4 py-4 sm:px-8">
          <Masthead />
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher syncAccount />
            <ThemeCycle current={theme} />
          </div>
        </header>
        <main id="main" className="flex flex-1 justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-[560px]">{children}</div>
        </main>
      </div>
    </AppProviders>
  );
}
