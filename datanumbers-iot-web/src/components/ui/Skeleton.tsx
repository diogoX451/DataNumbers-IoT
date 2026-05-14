import { cn } from "@/lib/cn";

/** Skeleton genérico — pulsa pra indicar carregamento. */
export function Skeleton({
  className,
  width,
  height,
}: {
  className?: string;
  width?: number | string;
  height?: number | string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded bg-bg-subtle animate-pulse",
        className,
      )}
      style={{ width, height }}
    />
  );
}
