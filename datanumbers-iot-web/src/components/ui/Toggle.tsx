import { cn } from "@/lib/cn";

export function Toggle({
  on,
  onChange,
  className,
  disabled,
}: {
  on: boolean;
  onChange?: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={cn(
        "relative inline-block w-8 h-[18px] rounded-full transition-colors shrink-0",
        on ? "bg-accent" : "bg-border-strong",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-[left]",
          on ? "left-4" : "left-0.5",
        )}
      />
    </button>
  );
}
