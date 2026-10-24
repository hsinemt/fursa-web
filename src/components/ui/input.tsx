import * as React from "react";
import { cn } from "@/lib/utils/cn";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "h-10 w-full min-w-0 rounded-control border border-control bg-panel px-3 text-base text-ink",
        "placeholder:text-slate pointer-coarse:h-11",
        "aria-invalid:border-danger",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
