import { cn } from "@/lib/cn";

export function Avatar({
  initials,
  size = 26,
  className,
}: {
  initials: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full grid place-items-center text-white font-bold shrink-0",
        "bg-gradient-to-br from-[oklch(0.7_0.15_320)] to-[oklch(0.62_0.18_265)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.42)),
      }}
    >
      {initials}
    </span>
  );
}
