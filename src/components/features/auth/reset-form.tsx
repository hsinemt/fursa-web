"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { updatePasswordAction } from "@/lib/auth/actions";
import { resetSchema, type ResetValues } from "@/lib/auth/schemas";
import { Field, useValidationMessage } from "./field";
import { useAuthSubmit } from "./use-auth-form";

export function ResetForm() {
  const t = useTranslations("auth");
  const message = useValidationMessage();
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { pending, error, submit } = useAuthSubmit<keyof ResetValues>({
    setFieldError: (field, key) => form.setError(field, { message: key }),
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ password }) =>
        submit(() => updatePasswordAction({ password })),
      )}
      className="flex flex-col gap-4"
    >
      {error ? <ErrorPanel message={t(`errors.${error}`)} /> : null}
      <Field
        label={t("fields.newPassword")}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        help={t("signup.passwordHelp")}
        error={message(errors.password?.message)}
        {...form.register("password")}
      />
      <Field
        label={t("fields.confirmPassword")}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        error={message(errors.confirm?.message)}
        {...form.register("confirm")}
      />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("reset.submit")}
      </Button>
    </form>
  );
}
