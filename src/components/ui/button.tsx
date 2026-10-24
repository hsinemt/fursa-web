import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Variants follow "Buttons" in fursa design.md:
 * - primary: the one main action of a view (at most one per view)
 * - secondary: the default
 * - ghost: low priority, text only
 * - destructive: danger text on a secondary button
 * - destructive-solid: filled danger, only inside a confirmation dialog
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-control border font-medium",
    "text-base whitespace-nowrap select-none",
    "h-10 px-4 pointer-coarse:h-11",
    "transition-colors duration-150 ease-out",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press",
        secondary: "border-control bg-transparent text-ink hover:bg-tint active:bg-tint",
        ghost: "border-transparent bg-transparent text-ink hover:bg-tint active:bg-tint",
        destructive:
          "border-control bg-transparent text-danger hover:bg-danger-bg active:bg-danger-bg",
        "destructive-solid":
          "border-transparent bg-danger text-on-accent hover:opacity-90 active:opacity-80",
      },
      size: {
        default: "",
        icon: "w-10 px-0 pointer-coarse:w-11",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
