import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar, type Crumb } from "./Topbar";

export function Shell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[var(--sidebar-w)_1fr] min-h-screen">
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <Topbar crumbs={crumbs} />
        <div className="px-7 py-6 pb-20 w-full max-w-[1380px]">{children}</div>
      </div>
    </div>
  );
}
