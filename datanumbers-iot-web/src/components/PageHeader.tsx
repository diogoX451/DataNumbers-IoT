import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo opcional antes do título (ex.: botão Voltar). */
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {leading}
        <h1 className="text-[22px] font-bold tracking-tight m-0 mb-1">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-fg-muted m-0">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
