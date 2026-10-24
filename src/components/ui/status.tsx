import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type JobStatus = "new" | "saved" | "applied" | "interview" | "offer" | "rejected";

const dotColor: Record<JobStatus, string> = {
  new: "bg-accent",
  saved: "bg-slate",
  applied: "bg-ink",
  interview: "bg-status-interview",
  offer: "bg-success",
  rejected: "bg-status-rejected",
};

/** An 8 px dot plus the word. Never a loud filled badge. */
function Status({
  status,
  children,
  className,
  ...props
}: React.ComponentProps<"span"> & { status: JobStatus }) {
  return (
    <span
      data-slot="status"
      data-status={status}
      className={cn("inline-flex items-center gap-2 text-sm text-ink", className)}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dotColor[status])} />
      {children}
    </span>
  );
}

export { Status };
