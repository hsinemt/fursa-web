"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Field } from "@/components/features/auth/field";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import {
  LIMITS,
  SENIORITIES,
  type ProfileProblems,
  type ProfileValues,
  type Seniority,
} from "@/lib/profile/values";
import { cn } from "@/lib/utils/cn";

type ListKey = "roles" | "skills" | "locations";

type TagGroupProps = {
  name: ListKey;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** The section or step title already names the field: the label stays for screen readers only. */
  hideLabel?: boolean;
  /** The step's own text already explains the field. */
  hideHelp?: boolean;
};

/** A list field of the profile: label, a short explanation and the tag input. */
export function TagGroup({ name, value, onChange, disabled, hideLabel, hideHelp }: TagGroupProps) {
  const t = useTranslations(`profile.${name}`);
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {t("label")}
      </Label>
      {hideHelp ? null : (
        <p id={helpId} className="text-sm text-slate">
          {t("help")}
        </p>
      )}
      <TagInput
        id={id}
        value={value}
        onChange={onChange}
        max={LIMITS[name]}
        placeholder={t("placeholder")}
        disabled={disabled}
        describedBy={hideHelp ? undefined : helpId}
      />
    </div>
  );
}

type SeniorityPickerProps = {
  value: ProfileValues["seniority"];
  onChange: (next: ProfileValues["seniority"]) => void;
  disabled?: boolean;
};

/** One level, or none: every option visible, the chosen one marked (never by color alone). */
export function SeniorityPicker({ value, onChange, disabled }: SeniorityPickerProps) {
  const t = useTranslations("profile.seniority");
  const options: { code: Seniority | ""; label: string }[] = [
    { code: "", label: t("none") },
    ...SENIORITIES.map((code) => ({ code, label: t(`options.${code}`) })),
  ];
  return (
    <div role="group" aria-label={t("label")} className="flex flex-wrap gap-2">
      {options.map(({ code, label }) => (
        <button
          key={code || "none"}
          type="button"
          disabled={disabled}
          aria-pressed={code === value}
          onClick={() => onChange(code)}
          className={cn(
            "h-10 rounded-control border px-4 text-base pointer-coarse:h-11",
            code === value
              ? "border-accent bg-tint text-accent"
              : "border-control bg-transparent text-ink hover:bg-tint",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type SalaryGroupProps = {
  values: Pick<ProfileValues, "salaryMin" | "salaryMax" | "currency">;
  problems: ProfileProblems;
  onChange: (patch: Partial<ProfileValues>) => void;
  disabled?: boolean;
};

/** Minimum, maximum and currency. Optional; the numbers read left to right in every language. */
export function SalaryGroup({ values, problems, onChange, disabled }: SalaryGroupProps) {
  const t = useTranslations("profile.salary");
  const v = useTranslations("profile.validation");
  const problem = (key: string | undefined) => (key ? v(key as "currency_invalid") : undefined);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field
        label={t("min")}
        inputMode="numeric"
        dir="ltr"
        value={values.salaryMin}
        disabled={disabled}
        error={problem(problems.salaryMin)}
        onChange={(event) => onChange({ salaryMin: event.target.value })}
      />
      <Field
        label={t("max")}
        inputMode="numeric"
        dir="ltr"
        value={values.salaryMax}
        disabled={disabled}
        error={problem(problems.salaryMax)}
        onChange={(event) => onChange({ salaryMax: event.target.value })}
      />
      <Field
        label={t("currency")}
        help={t("currencyHelp")}
        dir="ltr"
        maxLength={3}
        autoCapitalize="characters"
        value={values.currency}
        disabled={disabled}
        error={problem(problems.currency)}
        onChange={(event) => onChange({ currency: event.target.value.toUpperCase() })}
      />
    </div>
  );
}
