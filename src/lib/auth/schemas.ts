import { z } from "zod";
import { locales } from "@/i18n/routing";

/**
 * The forms are validated here, in the browser for quick feedback and again on the server
 * (never trust the browser alone). The messages are keys under `auth.validation`.
 */
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

const email = z.string().trim().pipe(z.email("email_invalid"));
const newPassword = z
  .string()
  .min(MIN_PASSWORD, "password_short")
  .max(MAX_PASSWORD, "password_long");
const locale = z.enum(locales);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "password_required"),
});

const name = z.string().trim().min(1, "name_required").max(60, "name_long");

export const signupSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password: newPassword,
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "password_mismatch",
  });

/** What the browser sends to a server action: the form values, the language, where to go next. */
export const loginInput = loginSchema.extend({
  locale,
  next: z.string().optional(),
});
export const signupInput = signupSchema.extend({ locale });
export const forgotInput = forgotSchema.extend({ locale });
export const resetInput = z.object({ password: newPassword });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
