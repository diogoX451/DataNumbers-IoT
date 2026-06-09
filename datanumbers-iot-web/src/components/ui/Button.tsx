import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-[var(--accent-fg)] border-transparent hover:bg-[var(--accent-hover)]",
  secondary:
    "bg-bg-elev text-fg border-border-strong hover:bg-bg-hover hover:border-fg-subtle",
  ghost:
    "bg-transparent text-fg-muted border-transparent hover:bg-bg-hover hover:text-fg",
  danger: "bg-danger text-white border-transparent hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-[5px] text-[12px]",
  md: "px-3 py-[7px] text-[13px]",
  lg: "px-4 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-sm border font-medium",
        "whitespace-nowrap select-none transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
});
