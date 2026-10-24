"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import { accountDeletedAction } from "@/lib/auth/actions";

/**
 * What a screen does when the API refuses because of the session. Returns a function to call
 * with any error caught from `call(...)`: it returns true if it handled the error (the
 * person is on their way to the login page), false if the screen should show the error.
 *
 * - 401 `missing_token`, `invalid_token`, and `token_expired` that could not be refreshed:
 *   go to login, and come back to this page afterwards.
 * - 403 `account_deleted`: sign out, clear both cookies, go to login.
 */
export function useApiErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    async (error: unknown): Promise<boolean> => {
      if (!(error instanceof ApiError)) return false;

      if (error.action === "login" || error.action === "refresh_then_login") {
        const query = typeof window === "undefined" ? "" : window.location.search;
        router.replace({ pathname: "/login", query: { next: `${pathname}${query}` } });
        return true;
      }
      if (error.action === "sign_out") {
        await accountDeletedAction(); // clears both cookies, then redirects to the login page
        return true;
      }
      return false;
    },
    [router, pathname],
  );
}
