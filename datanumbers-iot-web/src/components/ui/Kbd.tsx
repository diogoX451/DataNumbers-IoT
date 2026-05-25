import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Kbd({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <kbd
      className={cn(
        "font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-elev border border-border text-fg-subtle",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
