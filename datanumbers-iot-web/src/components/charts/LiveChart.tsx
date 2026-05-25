import { useId } from "react";

export type LivePoint = { time: number; value: number };

type Props = {
  data: LivePoint[];
  color?: string;
  height?: number;
  unit?: string;
};

/**
 * Gráfico de linha em SVG com Y-axis textual (sem libs). Pensado pra
 * receber arrays curtos (20–60 pontos) atualizando em tempo real.
 */
export function LiveChart({
  data,
  color = "var(--accent)",
  height = 240,
  unit = "",
}: Props) {
  const id = useId();
  const w = 720;

  if (!data || data.length === 0) {
    return <div style={{ height }} />;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.2 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const range = yMax - yMin;
  const chartH = height - 30;

  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = chartH - ((d.value - yMin) / range) * chartH;
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${chartH} L0,${chartH} Z`;

  const ticks = [yMax, (yMax + yMin) / 2, yMin].map((v) => v.toFixed(1));

  return (
    <div className="flex gap-2">
      <div
        className="flex flex-col justify-between text-[10px] text-fg-subtle font-mono"
        style={{ height: chartH }}
      >
        {ticks.map((t, i) => (
          <div key={i}>
            {t}
            {unit}
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((p, i) => (
          <line
            key={i}
            x1="0"
            x2={w}
            y1={chartH * p}
            y2={chartH * p}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={area} fill={`url(#${id})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.length > 0 && (
          <circle
            cx={pts[pts.length - 1][0]}
            cy={pts[pts.length - 1][1]}
            r="3"
            fill={color}
            stroke="var(--bg-elev)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
