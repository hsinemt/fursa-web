import { cookies } from "next/headers";
import { AppProviders } from "@/components/providers/app-providers";
import { AccountMenu } from "@/components/layout/account-menu";
import { TabBar } from "@/components/layout/tab-bar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { getCurrentUser } from "@/lib/auth/server";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** The app shell: top bar on tablet and laptop, bottom tab bar on phones. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [jar, user] = await Promise.all([cookies(), getCurrentUser()]);
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);

  return (
    <AppProviders>
      <TopBar
        accountControl={
          <>
            {/* The dev console exists only outside production (page.dev.tsx). */}
            {process.env.NODE_ENV !== "production" ? (
              <Button asChild variant="ghost">
                <Link href="/dev">Dev</Link>
              </Button>
            ) : null}
            <AccountMenu email={user?.email ?? null} theme={theme} />
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
