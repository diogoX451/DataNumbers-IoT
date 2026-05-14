import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  noPadding = false,
}: {
  className?: string;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-bg-elev border border-border rounded-lg overflow-hidden",
        className,
      )}
      data-pad={noPadding ? "none" : "default"}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-[18px] py-[14px] border-b border-border flex items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {title && <h3 className="text-[13px] font-semibold m-0">{title}</h3>}
        {subtitle && (
          <p className="text-[12px] text-fg-muted m-0 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-[18px]", className)}>{children}</div>;
}
