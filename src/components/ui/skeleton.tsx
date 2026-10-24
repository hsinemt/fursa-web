import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Placeholder for loading content. Give it the height of the real thing. No spinners over pages. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-chip bg-line", className)}
      {...props}
    />
  );
}

export { Skeleton };
