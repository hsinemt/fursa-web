"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { profileStrength, type ProfileValues } from "@/lib/profile/values";
import { cn } from "@/lib/utils/cn";

/** The text that names a part in the checklist and its card. */
const PART_LABEL = {
  roles: "roles.label",
  skills: "skills.label",
  locations: "locations.label",
  seniority: "seniority.label",
  salary: "salary.title",
} as const;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0">
      <p className="tabular text-xl font-medium text-ink">{value}</p>
      <p className="truncate text-sm text-slate">{label}</p>
    </div>
  );
}

/**
 * The start side of the profile page: who this is (avatar, email, headline, counts) and how
 * complete the profile is. The strength is worked out from the form, so it grows as the
 * person types. A missing part links to its card.
 */
export function ProfileRail({ email, values }: { email: string | null; values: ProfileValues }) {
  const t = useTranslations("profile");
  const levelT = useTranslations("profile.seniority.options");
  const { percent, parts } = profileStrength(values);

  const headline = [values.seniority ? levelT(values.seniority) : null, values.roles[0] ?? null]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const initial = (email?.trim()[0] ?? "?").toLocaleUpperCase();

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-6">
      <section aria-labelledby="profile-identity" className="rounded-panel bg-panel p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-xl text-on-accent"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h2 id="profile-identity" className="text-md">
              {t("rail.yourProfile")}
            </h2>
            {email ? (
              <p dir="ltr" className="truncate text-start text-sm text-slate">
                {email}
              </p>
            ) : null}
          </div>
        </div>
        <p dir="auto" className={cn("mt-4 text-base", headline ? "text-ink" : "text-slate")}>
          {headline || t("rail.noHeadline")}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <Stat value={values.roles.length} label={t("roles.label")} />
          <Stat value={values.skills.length} label={t("skills.label")} />
          <Stat value={values.locations.length} label={t("locations.label")} />
        </div>
      </section>

      <section aria-labelledby="profile-strength" className="rounded-panel bg-panel p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="profile-strength" className="text-md">
            {t("rail.strength")}
          </h2>
          <p className="tabular text-xl font-medium text-accent">{percent}%</p>
        </div>
        <div aria-hidden="true" className="mt-3 h-1.5 rounded-chip bg-line">
          <div className="h-1.5 rounded-chip bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate">{t("rail.strengthHelp")}</p>
        <ul className="mt-4 flex flex-col gap-1">
          {parts.map(({ key, weight, done }) => (
            <li key={key}>
              {done ? (
                <p className="flex items-center gap-2 py-1.5 text-base text-ink">
                  <Check
                    className="shrink-0 text-success"
                    width={ICON_SM}
                    height={ICON_SM}
                    {...iconProps}
                  />
                  {t(PART_LABEL[key])}
                </p>
              ) : (
                <a
                  href={`#profile-${key}`}
                  className="flex items-center justify-between gap-2 rounded-control px-0 py-1.5 text-base text-accent hover:underline"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full border border-control"
                    />
                    {t(PART_LABEL[key])}
                  </span>
                  <span className="tabular text-sm text-slate">+{weight}%</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
