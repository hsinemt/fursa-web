import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { setTheme } from "@/app/actions/theme";
import { ICON_MD, iconProps } from "@/components/ui/icon";
import { THEMES, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

const icons = { light: Sun, dark: Moon, system: Monitor } as const;

/** Appearance choice: all three options visible, for Settings. */
export function ThemeList({ current }: { current: ThemeChoice }) {
  const t = useTranslations("theme");
  return (
    <form action={setTheme}>
      <div role="group" aria-label={t("label")} className="flex flex-wrap gap-2">
        {THEMES.map((choice) => {
          const Icon = icons[choice];
          return (
            <button
              key={choice}
              type="submit"
              name="theme"
              value={choice}
              aria-pressed={choice === current}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-control border px-4 text-base pointer-coarse:h-11",
                choice === current
                  ? "border-accent bg-tint text-accent"
                  : "border-control bg-transparent text-ink hover:bg-tint",
              )}
            >
              <Icon width={ICON_MD} height={ICON_MD} {...iconProps} />
              {t(choice)}
            </button>
          );
        })}
      </div>
    </form>
  );
}

/** One icon button for the top bar: moves to the next choice (light, dark, system). */
export function ThemeCycle({ current }: { current: ThemeChoice }) {
  const t = useTranslations("theme");
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length] ?? "system";
  const Icon = icons[current];
  return (
    <form action={setTheme}>
      <button
        type="submit"
        name="theme"
        value={next}
        aria-label={`${t("label")}: ${t(current)}`}
        title={`${t("label")}: ${t(current)}`}
        className="inline-flex size-10 items-center justify-center rounded-control text-slate hover:bg-tint hover:text-ink pointer-coarse:size-11"
      >
        <Icon width={ICON_MD} height={ICON_MD} {...iconProps} />
      </button>
    </form>
  );
}
