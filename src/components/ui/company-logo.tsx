"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** The first letter or digit of a company name, upper case ("?" when there is none). */
export function companyInitial(name: string): string {
  const match = /[\p{L}\p{N}]/u.exec(name.trim());
  return match ? match[0].toLocaleUpperCase() : "?";
}

/**
 * A company's logo tile: 8 px corners, --panel fill, a hairline. It shows the logo the source
 * gave (`src`, an https address loaded straight from the source's own server, with no referrer
 * sent), and the company's initial in the heading font when there is none or it does not load.
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
  size?: "sm" | "md" | "lg";
}) {
  // The address that failed, so a new `src` gets its own try.
  const [failed, setFailed] = React.useState<string | null>(null);
  const showImage = Boolean(src) && failed !== src;

  return (
    <span
      data-slot="company-logo"
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-panel border border-line bg-panel font-heading text-ink",
        size === "sm" ? "size-8 text-md" : size === "md" ? "size-10 text-lg" : "size-14 text-xl",
        className,
      )}
      {...props}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- the logo comes from the job's source, not from our own files
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src ?? null)}
          className="size-full object-contain p-0.5"
        />
      ) : (
        companyInitial(name)
      )}
    </span>
  );
}

export { CompanyLogo };
