"use client";

import { Check, CircleAlert, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ICON_SM, ICON_MD, iconProps } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const KNOWN_VALIDATION = [
  "email_invalid",
  "password_required",
  "password_short",
  "password_long",
  "password_mismatch",
  "name_required",
  "name_long",
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
  /** Something at the end of the label row, like "Forgot your password?". */
  labelAction?: React.ReactNode;
};

/**
 * A form field: the label above (never the placeholder), a short hint below, and an error
 * as an icon and a sentence (never color alone), tied to the input for screen readers.
 * A password field gets a show/hide button inside it, at its end.
 */
export function Field({ label, help, error, labelAction, type, ...input }: FieldProps) {
  const t = useTranslations("auth.fields");
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(isPassword && "pe-12")}
          {...input}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            aria-pressed={visible}
            className="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-slate hover:bg-tint hover:text-ink pointer-coarse:size-11"
          >
            {visible ? (
              <EyeOff width={ICON_MD} height={ICON_MD} {...iconProps} />
            ) : (
              <Eye width={ICON_MD} height={ICON_MD} {...iconProps} />
            )}
          </button>
        ) : null}
      </div>
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

/**
 * A live requirement under a new password: a check and the text when it is met, a hollow
 * square while it is not (the state is never shown by color alone).
 */
export function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-chip transition-colors duration-200 ease-out",
          met ? "bg-accent text-on-accent" : "border border-control",
        )}
      >
        {met ? <Check width={12} height={12} {...iconProps} /> : null}
      </span>
      <span className={met ? "text-ink" : undefined}>{children}</span>
      <span className="sr-only">{met ? "✓" : ""}</span>
    </p>
  );
}
