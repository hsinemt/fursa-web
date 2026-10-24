"use client";

import { Check, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { setTheme } from "@/app/actions/theme";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { THEMES, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;

const item =
  "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-base text-ink outline-none data-[highlighted]:bg-tint pointer-coarse:py-3";

/** The first letter of the email (or "?"), upper case. */
export function emailInitial(email: string | null): string {
  return (email?.trim()[0] ?? "?").toLocaleUpperCase();
}

/**
 * The avatar at the end of the top bar. It opens a menu: the email, Profile, Settings,
 * Appearance (light, dark or system) and Sign out. Radix handles the keyboard (arrows, Escape,
 * focus back to the avatar) and the direction; a language that reads right to left opens it
 * toward the other side.
 */
export function AccountMenu({ email, theme }: { email: string | null; theme: ThemeChoice }) {
  const t = useTranslations();
  const locale = useLocale();

  function choose(choice: string) {
    const data = new FormData();
    data.set("theme", choice);
    void setTheme(data);
  }

  return (
    <DropdownMenu.Root dir={locale === "ar" ? "rtl" : "ltr"}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("nav.accountMenu")}
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent font-heading text-md text-on-accent hover:bg-accent-hover data-[state=open]:bg-accent-press pointer-coarse:size-11"
        >
          {emailInitial(email)}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-panel border border-line bg-panel p-1 font-sans text-base text-ink shadow-menu"
        >
          {email ? (
            <DropdownMenu.Label
              dir="ltr"
              className="truncate px-3 py-2 text-start text-sm text-slate"
            >
              {email}
            </DropdownMenu.Label>
          ) : null}

          <DropdownMenu.Item asChild className={item}>
            <Link href="/profile">
              <User width={ICON_SM} height={ICON_SM} className="text-slate" {...iconProps} />
              {t("nav.profile")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/settings">
              <SlidersHorizontal
                width={ICON_SM}
                height={ICON_SM}
                className="text-slate"
                {...iconProps}
              />
              {t("nav.settings")}
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-sm text-slate">
            {t("theme.label")}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={choose}>
            {THEMES.map((choice) => {
              const Icon = themeIcons[choice];
              return (
                <DropdownMenu.RadioItem key={choice} value={choice} className={item}>
                  <Icon width={ICON_SM} height={ICON_SM} className="text-slate" {...iconProps} />
                  <span className="flex-1">{t(`theme.${choice}`)}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check
                      width={ICON_SM}
                      height={ICON_SM}
                      className={cn("text-accent")}
                      {...iconProps}
                    />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={() => void signOutAction()}>
            <LogOut
              width={ICON_SM}
              height={ICON_SM}
              className="text-slate rtl:-scale-x-100"
              {...iconProps}
            />
            {t("auth.signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
