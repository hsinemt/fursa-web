import { cookies } from "next/headers";
import { AppProviders } from "@/components/providers/app-providers";
import { TabBar } from "@/components/layout/tab-bar";
import { ThemeCycle } from "@/components/layout/theme-switcher";
import { SignOutButton } from "@/components/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** The app shell: top bar on tablet and laptop, bottom tab bar on phones. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <AppProviders>
      <TopBar
        themeControl={<ThemeCycle current={theme} />}
        accountControl={
          <>
            {/* The dev console exists only outside production (page.dev.tsx). */}
            {process.env.NODE_ENV !== "production" ? (
              <Button asChild variant="ghost">
                <Link href="/dev">Dev</Link>
              </Button>
            ) : null}
            <SignOutButton />
          </>
        }
      />
      <main id="main" className="w-full px-4 py-6 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
      <TabBar />
    </AppProviders>
  );
}
