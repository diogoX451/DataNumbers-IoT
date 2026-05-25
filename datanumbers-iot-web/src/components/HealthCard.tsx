import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Metric = { label: string; value: string };

export function HealthCard({
  status = "ok",
  title,
  subtitle,
  metrics,
}: {
  status?: "ok" | "warn";
  title: string;
  subtitle: ReactNode;
  metrics: Metric[];
}) {
  return (
    <div className="bg-gradient-to-br from-bg-elev to-bg-subtle border border-border rounded-xl px-5 py-5 flex items-center gap-4 flex-wrap">
      <div
        className={
          status === "ok"
            ? "w-11 h-11 rounded-full grid place-items-center bg-success-bg text-success border border-success-br"
            : "w-11 h-11 rounded-full grid place-items-center bg-warn-bg text-warn border border-warn-br"
        }
      >
        <Icon name="checkCircle" size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[12px] text-fg-muted">{subtitle}</div>
      </div>
      <div className="flex gap-6 shrink-0">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {m.label}
            </div>
            <div className="text-[18px] font-bold">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
