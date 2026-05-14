import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6 flex flex-col items-center gap-2">
      <div className="w-11 h-11 rounded-md bg-bg-subtle border border-border grid place-items-center text-fg-subtle mb-1.5">
        <Icon name={icon} size={20} />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {description && (
        <div className="text-[12px] text-fg-muted max-w-[340px]">
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
