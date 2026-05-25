import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full px-[11px] py-2 bg-bg-elev text-fg",
  "border border-border-strong rounded-sm text-[13px]",
  "outline-none transition-colors",
  "focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_18%,transparent)]",
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...rest} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(fieldClass, className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(fieldClass, "min-h-20", className)} {...rest} />
  );
});

export function Label({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "block text-[12px] font-medium text-fg mb-1.5",
        className,
      )}
    >
      {children}
    </label>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-fg-subtle mt-1">{children}</div>;
}
