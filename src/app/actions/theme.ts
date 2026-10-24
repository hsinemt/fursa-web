"use server";

import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

/** Saves the appearance choice in a cookie so the server renders the right mode (no flash). */
export async function setTheme(formData: FormData) {
  const raw = formData.get("theme");
  const theme = parseTheme(typeof raw === "string" ? raw : undefined);
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
