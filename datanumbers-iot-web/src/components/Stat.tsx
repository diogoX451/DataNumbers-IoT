import { cn } from "@/lib/cn";
import { Sparkline } from "./charts/Sparkline";

export function Stat({
  label,
  value,
  unit,
  delta,
  deltaDir,
  spark,
  color = "var(--accent)",
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  color?: string;
}) {
  return (
    <div className="bg-bg-elev border border-border rounded-lg p-4 overflow-hidden">
      <div className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-bold tracking-tight">
          {value}
          {unit && (
            <span className="text-[14px] text-fg-muted font-medium ml-0.5">
              {unit}
            </span>
          )}
        </span>
        {delta && (
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-px rounded",
              deltaDir === "up"
                ? "text-success bg-success-bg"
                : "text-danger bg-danger-bg",
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {spark && (
        <div className="mt-2.5 h-7 overflow-hidden">
          <Sparkline values={spark} color={color} height={28} />
        </div>
      )}
    </div>
  );
}
