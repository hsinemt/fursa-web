"use client";

import { useState, useTransition } from "react";
import type { AuthResult } from "@/lib/auth/actions";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { useRouter } from "@/i18n/navigation";

/**
 * What every auth form does with the answer of its Server Action: go to the next page,
 * show field problems the server found, or show one error sentence above the button.
 */
export function useAuthSubmit<Field extends string>(options: {
  /** Puts a field problem (a key under auth.validation) on its field. */
  setFieldError: (field: Field, key: string) => void;
  /** Called when the server accepted the form and there is nowhere to go (reset email sent). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AuthErrorKey | null>(null);

  function submit(send: () => Promise<AuthResult>) {
    setError(null);
    startTransition(async () => {
      const result = await send();
      if (result.ok) {
        if (result.next) router.replace(result.next);
        else options.onDone?.();
        return;
      }
      for (const [field, key] of Object.entries(result.fieldErrors ?? {})) {
        options.setFieldError(field as Field, key);
      }
      setError(result.error);
    });
  }

  return { pending, error, submit };
}
