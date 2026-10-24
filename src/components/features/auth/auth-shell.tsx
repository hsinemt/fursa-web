import { Info } from "lucide-react";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ICON_MD, iconProps } from "@/components/ui/icon";

/**
 * The frame of every auth page, on the form side of the split screen: the title, one sentence,
 * an optional notice, the form (no card around it), and a line of links under it.
 */
export function AuthShell({
  title,
  intro,
  notice,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  notice?: { kind: "error" | "info"; text: string };
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-heading text-title text-balance text-ink">{title}</h1>
      {intro ? <p className="mt-2 text-md text-slate">{intro}</p> : null}
      {notice ? (
        <div className="mt-6">
          {notice.kind === "error" ? (
            <ErrorPanel message={notice.text} />
          ) : (
            <p role="status" className="flex gap-3 rounded-panel bg-tint p-4 text-ink">
              <Info
                className="shrink-0 text-accent"
                width={ICON_MD}
                height={ICON_MD}
                {...iconProps}
              />
              {notice.text}
            </p>
          )}
        </div>
      ) : null}
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-8 text-slate">{footer}</div> : null}
    </div>
  );
}
