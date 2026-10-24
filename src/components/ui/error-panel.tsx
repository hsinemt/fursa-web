import { CircleAlert } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ICON_MD, iconProps } from "./icon";

type ErrorPanelProps = React.ComponentProps<"div"> & {
  /** The message in plain words, saying what to do. */
  message: string;
  /** The technical code, shown small underneath. */
  code?: string;
};

/** Inline error: an icon and a sentence (never color alone), the code in small text. */
function ErrorPanel({ message, code, className, ...props }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      data-slot="error-panel"
      className={cn("flex gap-3 rounded-panel bg-danger-bg p-4 text-danger", className)}
      {...props}
    >
      <CircleAlert className="shrink-0" width={ICON_MD} height={ICON_MD} {...iconProps} />
      <div className="min-w-0">
        <p className="text-base">{message}</p>
        {code ? <p className="tabular mt-1 text-xs">{code}</p> : null}
      </div>
    </div>
  );
}

export { ErrorPanel };
