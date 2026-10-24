"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { forgotSchema, type ForgotValues } from "@/lib/auth/schemas";
import { Field, useValidationMessage } from "./field";
import { useAuthSubmit } from "./use-auth-form";

export function ForgotForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const message = useValidationMessage();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  const { pending, error, submit } = useAuthSubmit<keyof ForgotValues>({
    setFieldError: (field, key) => form.setError(field, { message: key }),
    onDone: () => setSent(true),
  });
  const { errors } = form.formState;

  // The same sentence whether or not an account exists: nobody can use this to find out.
  if (sent) {
    return (
      <p role="status" className="text-ink">
        {t("forgot.sent")}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        submit(() => requestPasswordResetAction({ ...values, locale })),
      )}
      className="flex flex-col gap-4"
    >
      {error ? <ErrorPanel message={t(`errors.${error}`)} /> : null}
      <Field
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        dir="ltr"
        error={message(errors.email?.message)}
        {...form.register("email")}
      />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("forgot.submit")}
      </Button>
    </form>
  );
}
