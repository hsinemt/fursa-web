import * as React from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** A short line that names the space. */
  title: string;
  /** One line of help. */
  description?: string;
  /** The next action (a button or link). */
  action?: React.ReactNode;
};

/** Text only: no illustrations. */
function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn("py-8", className)} {...props}>
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 text-slate">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
