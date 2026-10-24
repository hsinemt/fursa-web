import { Info } from "lucide-react";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ICON_MD, iconProps } from "@/components/ui/icon";

/**
 * The frame of every auth page: a title, one sentence, an optional notice, the form in a
 * panel, and a line of links under it. Forms are narrow (up to 448 px), as `fursa design.md`
 * asks (forms up to 640 px).
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
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <h1 className="font-heading text-title text-balance text-ink">{title}</h1>
      {intro ? <p className="mt-2 text-slate">{intro}</p> : null}
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
      <div className="mt-6 rounded-panel border border-line bg-panel p-6">{children}</div>
      {footer ? <div className="mt-6 text-slate">{footer}</div> : null}
    </div>
  );
}
