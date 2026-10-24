"use client";

import { useTranslations } from "next-intl";
import { Status } from "@/components/ui/status";
import { STATUSES, type UserJobStatus } from "@/lib/feed/values";
import { cn } from "@/lib/utils/cn";

/** Your status for a job: five buttons, the current one pressed. The change shows at once. */
export function StatusGroup({
  value,
  onChange,
}: {
  value: UserJobStatus;
  onChange: (status: UserJobStatus) => void;
}) {
  const t = useTranslations("status");
  const label = useTranslations("job");
  return (
    <div role="group" aria-label={label("statusLabel")} className="flex flex-wrap gap-1.5">
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={cn(
            "inline-flex h-9 items-center rounded-control border px-2.5 pointer-coarse:h-11",
            value === status
              ? "border-accent bg-tint font-medium text-accent"
              : "border-control text-ink hover:bg-tint",
          )}
        >
          <Status status={status} className="text-sm text-current">
            {t(status)}
          </Status>
        </button>
      ))}
    </div>
  );
}
