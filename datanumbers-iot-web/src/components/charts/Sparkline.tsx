import { useId } from "react";

type Props = {
  values: number[];
  color?: string;
  height?: number;
  fill?: boolean;
};

/**
 * Sparkline SVG mínimo: linha + area com gradient. Não usa biblioteca
 * de charts — economiza ~80kb de bundle e o caso é simples.
 */
export function Sparkline({
  values,
  color = "var(--accent)",
  height = 32,
  fill = true,
}: Props) {
  const id = useId();
  if (!values || values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const padTop = 4;
  const padBot = 6;
  const drawH = height - padTop - padBot;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = padTop + (1 - (v - min) / range) * drawH;
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${height - padBot} L0,${height - padBot} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className="block w-full h-full overflow-hidden"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
