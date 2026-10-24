import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ICON_SM, iconProps } from "./icon";

type ChipProps = React.ComponentProps<"span"> & {
  /** matched: tint fill, accent text and a check. missing: outline only. */
  kind: "matched" | "missing";
};

/** Skill chip. Meaning is never by color alone: a matched skill also has a check. */
function Chip({ kind, className, children, ...props }: ChipProps) {
  return (
    <span
      data-slot="chip"
      data-kind={kind}
      dir="auto"
      className={cn(
        "inline-flex items-center gap-1 rounded-chip px-2 py-1 text-xs",
        kind === "matched" ? "bg-tint text-accent" : "border border-line bg-transparent text-slate",
        className,
      )}
      {...props}
    >
      {kind === "matched" ? <Check width={12} height={ICON_SM - 4} {...iconProps} /> : null}
      {children}
    </span>
  );
}

export { Chip };
