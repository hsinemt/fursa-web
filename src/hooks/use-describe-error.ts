"use client";

import { useTranslations } from "next-intl";
import { describeError, type Translate } from "@/lib/api";

/** `const describe = useDescribeError(); describe(error).message` in the person's language. */
export function useDescribeError() {
  const t = useTranslations("errors");
  // next-intl types its keys; describeError picks them from the API's code at run time.
  return (error: unknown) => describeError(error, t as unknown as Translate);
}
