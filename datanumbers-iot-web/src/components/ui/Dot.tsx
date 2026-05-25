import { cn } from "@/lib/cn";

type Status = "online" | "warn" | "error" | "neutral";

const colors: Record<Status, string> = {
  online: "bg-success",
  warn: "bg-warn",
  error: "bg-danger",
  neutral: "bg-fg-subtle",
};

export function Dot({
  status = "neutral",
  live = false,
  size = "sm",
  className,
}: {
  status?: Status;
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        colors[status],
        size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5",
        live && status === "online" && "dot-live",
        status === "online" &&
          "shadow-[0_0_0_3px_color-mix(in_oklch,var(--success)_25%,transparent)]",
        className,
      )}
    />
  );
}
