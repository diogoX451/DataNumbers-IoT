export function SignalBars({ dbm }: { dbm: number }) {
  const lvl = dbm > -50 ? 4 : dbm > -60 ? 3 : dbm > -70 ? 2 : 1;
  return (
    <div className="flex gap-0.5 items-end h-3">
      {[1, 2, 3, 4].map((b) => {
        const lit = b <= lvl;
        const color = lit
          ? lvl >= 3
            ? "var(--success)"
            : "var(--warn)"
          : "var(--border-strong)";
        return (
          <span
            key={b}
            className="w-[3px] rounded-sm"
            style={{ height: b * 3, background: color }}
          />
        );
      })}
      <span className="ml-1.5 font-mono text-[11px] text-fg-muted">
        {dbm}dBm
      </span>
    </div>
  );
}

export function BatteryBar({ pct }: { pct: number }) {
  const color =
    pct > 50 ? "var(--success)" : pct > 20 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-9 h-2 bg-bg-subtle border border-border rounded-sm overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[11px] text-fg-muted">{pct}%</span>
    </div>
  );
}
