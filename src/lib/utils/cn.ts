import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our type scale adds sizes Tailwind does not know (see globals.css). Without this,
// twMerge would treat "text-md" or "text-display" as colors and drop one of them.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["md", "title", "display", "statement", "numeral"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
