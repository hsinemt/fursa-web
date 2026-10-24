import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { signOutAction } from "@/lib/auth/actions";

/** Ends the session on the server, clears both cookies and goes to the login page. */
export function SignOutButton({ variant = "ghost" }: { variant?: "ghost" | "secondary" }) {
  const t = useTranslations("auth");
  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant}>
        <LogOut width={ICON_SM} height={ICON_SM} className="rtl:-scale-x-100" {...iconProps} />
        {t("signOut")}
      </Button>
    </form>
  );
}
