"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Link } from "@/i18n/navigation";
import { signInAction } from "@/lib/auth/actions";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { Field, useValidationMessage } from "./field";
import { useAuthSubmit } from "./use-auth-form";

export function LoginForm({ next }: { next: string | null }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const message = useValidationMessage();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { pending, error, submit } = useAuthSubmit<keyof LoginValues>({
    setFieldError: (field, key) => form.setError(field, { message: key }),
  });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        submit(() => signInAction({ ...values, locale, next: next ?? undefined })),
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
      <Field
        label={t("fields.password")}
        type="password"
        autoComplete="current-password"
        dir="ltr"
        error={message(errors.password?.message)}
        {...form.register("password")}
      />
      <Link href="/forgot-password" className="inline-link text-sm text-accent hover:underline">
        {t("login.forgot")}
      </Link>
      <Button type="submit" variant="primary" disabled={pending} className="w-full">
        {t("login.submit")}
      </Button>
    </form>
  );
}
