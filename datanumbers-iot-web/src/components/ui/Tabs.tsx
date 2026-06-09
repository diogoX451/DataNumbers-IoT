import { cn } from "@/lib/cn";

export type TabItem<T extends string> = {
  id: T;
  label: string;
};

export function Tabs<T extends string>({
  items,
  active,
  onChange,
  className,
}: {
  items: ReadonlyArray<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-0.5 border-b border-border mb-5", className)}>
      {items.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "px-3 py-2 text-[13px] font-medium border-b-2 -mb-px",
              isActive
                ? "text-fg border-accent font-semibold"
                : "text-fg-muted border-transparent hover:text-fg",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
