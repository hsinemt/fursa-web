import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** The first letter or digit of a company name, upper case ("?" when there is none). */
export function companyInitial(name: string): string {
  const match = /[\p{L}\p{N}]/u.exec(name.trim());
  return match ? match[0].toLocaleUpperCase() : "?";
}

/**
 * A company's logo tile: 8 px corners, --panel fill, a hairline and the initial in the heading
 * font. The API sends no logo yet; when it does, pass `src` and the image replaces the initial.
 * Decorative (the company name is always written beside it).
 */
function CompanyLogo({
  name,
  src,
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  name: string;
  src?: string | null;
  size?: "md" | "lg";
}) {
  return (
    <span
      data-slot="company-logo"
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-panel border border-line bg-panel font-heading text-ink",
        size === "md" ? "size-10 text-lg" : "size-14 text-xl",
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- the logo host is not known yet
        <img src={src} alt="" className="size-full object-contain" />
      ) : (
        companyInitial(name)
      )}
    </span>
  );
}

export { CompanyLogo };
