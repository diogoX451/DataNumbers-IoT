import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warn" | "danger" | "info" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-bg-subtle border-border text-fg-muted",
  success: "bg-success-bg border-success-br text-success",
  warn: "bg-warn-bg border-warn-br text-warn",
  danger: "bg-danger-bg border-danger-br text-danger",
  info: "bg-info-bg border-info-br text-info",
  accent: "bg-accent-bg border-accent-br text-accent",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
