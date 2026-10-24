"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { updatePasswordAction } from "@/lib/auth/actions";
import { MIN_PASSWORD, resetSchema, type ResetValues } from "@/lib/auth/schemas";
import { Field, Requirement, useValidationMessage } from "./field";
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
  const passwordLength = useWatch({ control: form.control, name: "password" }).length;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ password }) =>
        submit(() => updatePasswordAction({ password })),
      )}
      className="flex flex-col gap-5"
    >
      {error ? <ErrorPanel message={t(`errors.${error}`)} /> : null}
      <div className="flex flex-col gap-2">
        <Field
          label={t("fields.newPassword")}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          error={message(errors.password?.message)}
          {...form.register("password")}
        />
        <Requirement met={passwordLength >= MIN_PASSWORD}>{t("signup.passwordHelp")}</Requirement>
      </div>
      <Field
        label={t("fields.confirmPassword")}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        error={message(errors.confirm?.message)}
        {...form.register("confirm")}
      />
      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full">
        {t("reset.submit")}
      </Button>
    </form>
  );
}
