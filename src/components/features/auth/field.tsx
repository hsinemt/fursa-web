"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KNOWN_VALIDATION = [
  "email_invalid",
  "password_required",
  "password_short",
  "password_long",
  "password_mismatch",
] as const;

/** Turns a validation key from the schemas into a translated sentence. */
export function useValidationMessage() {
  const t = useTranslations("auth");
  return (key: string | undefined) => {
    if (!key) return undefined;
    const known = KNOWN_VALIDATION.find((k) => k === key);
    return known ? t(`validation.${known}`) : t("errors.unknown");
  };
}

type FieldProps = Omit<React.ComponentProps<typeof Input>, "id" | "aria-invalid"> & {
  label: string;
  /** A short hint under the field. */
  help?: string;
  /** The error sentence, already translated. */
  error?: string;
};

/**
 * A form field: the label above (never the placeholder), a short hint below, and an error
 * as an icon and a sentence (never color alone), tied to the input for screen readers.
 */
export function Field({ label, help, error, ...input }: FieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
      />
      {help ? (
        <p id={helpId} className="text-sm text-slate">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-sm text-danger">
          <CircleAlert width={ICON_SM} height={ICON_SM} className="shrink-0" {...iconProps} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
