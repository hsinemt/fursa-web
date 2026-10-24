import { cookies } from "next/headers";
import { TabBar } from "@/components/layout/tab-bar";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { TopBar } from "@/components/layout/top-bar";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** The app shell: top bar on tablet and laptop, bottom tab bar on phones. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <>
      <TopBar themeControl={<ThemeCycle current={theme} />} accountControl={<SignOutButton />} />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
      <TabBar />
    </>
  );
}
