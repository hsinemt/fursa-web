import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Dual-script masthead of the public pages: "Fursa" in Plex Serif and "فرصة" in Plex Sans
 * Arabic, side by side, whatever the page language. It is the page's logo until a real one
 * exists; the app screens keep the single wordmark.
 */
export function Masthead({ size = "lg", className }: { size?: "lg" | "sm"; className?: string }) {
  const text = size === "lg" ? "text-xl" : "text-md";
  return (
    <Link href="/" className={cn("inline-flex items-baseline gap-2 text-ink", className)}>
      <span className={cn("font-serif font-medium", text)}>Fursa</span>
      <span aria-hidden="true" className="text-slate">
        ·
      </span>
      <span lang="ar" className={cn("font-arabic font-medium", text)}>
        فرصة
      </span>
    </Link>
  );
}

/** The double rule under the masthead: a 2 px ink line, then a 1 px hairline. */
export function DoubleRule() {
  return (
    <div aria-hidden="true">
      <div className="border-t-2 border-ink" />
      <div className="mt-[3px] border-t border-line" />
    </div>
  );
}
