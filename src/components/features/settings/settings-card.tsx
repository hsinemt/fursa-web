import { Bell, Database, Languages, Send, SunMoon, User, type LucideIcon } from "lucide-react";
import { ICON_SM, iconProps } from "@/components/ui/icon";

export const SETTINGS_ICONS = {
  language: Languages,
  appearance: SunMoon,
  alerts: Bell,
  telegram: Send,
  data: Database,
  account: User,
} as const satisfies Record<string, LucideIcon>;

export type SettingsSection = keyof typeof SETTINGS_ICONS;

/** One group of the settings page: icon, title, one line of help, then its controls. */
export function SettingsCard({
  id,
  title,
  help,
  children,
}: {
  id: SettingsSection;
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  const Icon = SETTINGS_ICONS[id];
  return (
    <section id={`settings-${id}`} className="scroll-mt-6 rounded-panel bg-panel p-5">
      <div className="mb-4 flex items-start gap-3">
        <Icon
          className="mt-1 shrink-0 text-slate"
          width={ICON_SM}
          height={ICON_SM}
          {...iconProps}
        />
        <div className="min-w-0">
          <h2 className="text-md">{title}</h2>
          {help ? <p className="text-sm text-slate">{help}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
