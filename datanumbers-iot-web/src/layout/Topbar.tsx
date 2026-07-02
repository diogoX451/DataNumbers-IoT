import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import type { ReactNode } from "react";

export type Crumb = {
  label: string;
  to?: string;
};

export function Topbar({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <header className="bg-bg-elev border-b border-border h-[var(--header-h)] sticky top-0 z-10 flex items-center px-6 gap-4">
      <Breadcrumbs crumbs={crumbs} />
      <div className="flex-1" />
    </header>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Trilha"
      className="flex items-center gap-1.5 text-[13px] text-fg-muted"
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        const content: ReactNode = c.to && !last ? (
          <Link
            to={c.to}
            className="px-2 py-0.5 rounded hover:bg-bg-hover hover:text-fg"
          >
            {c.label}
          </Link>
        ) : (
          <span
            className={
              last
                ? "px-2 py-0.5 text-fg font-semibold"
                : "px-2 py-0.5 text-fg-muted"
            }
          >
            {c.label}
          </span>
        );
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <Icon name="chevronRight" size={12} className="text-fg-subtle" />}
            {content}
          </span>
        );
      })}
    </nav>
  );
}
