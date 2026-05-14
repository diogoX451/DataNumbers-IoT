import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <table className={cn("w-full border-collapse text-[13px]", className)}>
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  className,
  clickable,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        clickable && "cursor-pointer hover:bg-bg-subtle",
        className,
      )}
      {...rest}
    />
  );
}

export function TH({
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "text-left text-[11px] font-semibold text-fg-subtle uppercase tracking-wider",
        "px-4 py-2.5 border-b border-border bg-bg-subtle whitespace-nowrap",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TD({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3 border-b border-border align-middle",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
