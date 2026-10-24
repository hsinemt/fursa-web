"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { signUpAction } from "@/lib/auth/actions";
import { signupSchema, type SignupValues } from "@/lib/auth/schemas";
import { Field, useValidationMessage } from "./field";
import { useAuthSubmit } from "./use-auth-form";

export function SignupForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const message = useValidationMessage();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  });
  const { pending, error, submit } = useAuthSubmit<keyof SignupValues>({
    setFieldError: (field, key) => form.setError(field, { message: key }),
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      // The language goes with the form: the API uses it for the notes and messages it writes.
      onSubmit={form.handleSubmit((values) => submit(() => signUpAction({ ...values, locale })))}
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
      <Field
        label={t("fields.password")}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        help={t("signup.passwordHelp")}
        error={message(errors.password?.message)}
        {...form.register("password")}
      />
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("signup.submit")}
      </Button>
    </form>
  );
}
