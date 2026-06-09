import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classnames + faz merge inteligente para o Tailwind
 * (`p-2` vs `p-3` no mesmo elemento → mantém só o último).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
