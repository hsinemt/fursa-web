"use client";

import { useState } from "react";
import { useApiErrorHandler } from "@/hooks/use-api-error-handler";
import { useDescribeError } from "@/hooks/use-describe-error";
import type { DescribedError } from "@/lib/api";
import { useUpdateProfile } from "@/lib/profile/hooks";
import {
  buildPatch,
  isEmptyPatch,
  problemsFromApi,
  validate,
  type ProfileProblems,
  type ProfileValues,
} from "@/lib/profile/values";

/**
 * Saves the changed fields of the profile. Checks the salary first; sends only what
 * changed; puts the API's field problems on their fields and any other error in `error`.
 * Returns true when the profile is saved (or there was nothing to save).
 */
export function useSaveProfile() {
  const describe = useDescribeError();
  const mutation = useUpdateProfile();
  const handleSession = useApiErrorHandler();
  const [problems, setProblems] = useState<ProfileProblems>({});
  const [error, setError] = useState<DescribedError | null>(null);

  async function save(baseline: ProfileValues, current: ProfileValues): Promise<boolean> {
    setError(null);
    const found = validate(current);
    setProblems(found);
    if (Object.keys(found).length > 0) return false;

    const patch = buildPatch(baseline, current);
    if (isEmptyPatch(patch)) return true;
    try {
      await mutation.mutateAsync(patch);
      return true;
    } catch (cause) {
      if (await handleSession(cause)) return false;
      const fields = problemsFromApi(cause);
      setProblems(fields);
      if (Object.keys(fields).length === 0) setError(describe(cause));
      return false;
    }
  }

  return { save, saving: mutation.isPending, problems, setProblems, error };
}
