import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names without style conflicts.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
