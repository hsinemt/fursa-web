import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Dual-script masthead of the public pages: "Fursa" in DM Serif Display and "فرصة" in Plex
 * Sans Arabic, side by side, whatever the page language. It is the page's logo until a real
 * one exists; the app screens keep the single wordmark.
 * `tone="inverse"` is for the accent panel (on-accent text).
 */
export function Masthead({
  size = "lg",
  tone = "default",
  className,
}: {
  size?: "lg" | "sm";
  tone?: "default" | "inverse";
  className?: string;
}) {
  const text = size === "lg" ? "text-xl" : "text-md";
  const inverse = tone === "inverse";
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-baseline gap-2",
        inverse ? "text-on-accent" : "text-ink",
        className,
      )}
    >
      <span className={cn("font-serif", text)}>Fursa</span>
      <span aria-hidden="true" className={inverse ? "text-on-accent" : "text-slate"}>
        ·
      </span>
      <span lang="ar" className={cn("font-arabic font-medium", text)}>
        فرصة
      </span>
    </Link>
  );
}
