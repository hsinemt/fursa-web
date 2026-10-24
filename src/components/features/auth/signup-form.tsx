"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Link } from "@/i18n/navigation";
import { signUpAction } from "@/lib/auth/actions";
import { MIN_PASSWORD, signupSchema, type SignupValues } from "@/lib/auth/schemas";
import { Field, Requirement, useValidationMessage } from "./field";
import { useAuthSubmit } from "./use-auth-form";

export function SignupForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const message = useValidationMessage();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });
  const { pending, error, submit } = useAuthSubmit<keyof SignupValues>({
    setFieldError: (field, key) => form.setError(field, { message: key }),
  });
  const { errors } = form.formState;
  const passwordLength = useWatch({ control: form.control, name: "password" }).length;

  return (
    <form
      noValidate
      // The language goes with the form: the API uses it for the notes and messages it writes.
      onSubmit={form.handleSubmit((values) => submit(() => signUpAction({ ...values, locale })))}
      className="flex flex-col gap-5"
    >
      {error ? <ErrorPanel message={t(`errors.${error}`)} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("fields.firstName")}
          autoComplete="given-name"
          dir="auto"
          error={message(errors.firstName?.message)}
          {...form.register("firstName")}
        />
        <Field
          label={t("fields.lastName")}
          autoComplete="family-name"
          dir="auto"
          error={message(errors.lastName?.message)}
          {...form.register("lastName")}
        />
      </div>
      <Field
        label={t("fields.email")}
        type="email"
        autoComplete="email"
        dir="ltr"
        error={message(errors.email?.message)}
        {...form.register("email")}
      />
      <div className="flex flex-col gap-2">
        <Field
          label={t("fields.password")}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          error={message(errors.password?.message)}
          {...form.register("password")}
        />
        <Requirement met={passwordLength >= MIN_PASSWORD}>{t("signup.passwordHelp")}</Requirement>
      </div>
      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full">
        {t("signup.submit")}
      </Button>
      <p className="text-sm text-slate">
        {t.rich("signup.terms", {
          terms: (chunks) => (
            <Link href="/terms" className="inline-link text-accent hover:underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="inline-link text-accent hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
