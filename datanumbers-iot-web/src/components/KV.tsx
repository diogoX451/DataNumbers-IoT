import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export function KV({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-center gap-1.5 text-[12px]">
        <span
          className={cn(
            "flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
            mono && "font-mono",
          )}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(String(value))}
            className="w-[22px] h-[22px] grid place-items-center text-fg-muted rounded hover:bg-bg-hover hover:text-fg"
            aria-label={`Copiar ${label}`}
          >
            <Icon name="copy" size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

export function KVRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
