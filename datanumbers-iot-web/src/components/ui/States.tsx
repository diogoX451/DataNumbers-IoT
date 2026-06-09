import type { ReactNode } from "react";
import { Icon } from "../Icon";

export function LoadingState({
  label = "Carregando…",
}: {
  label?: string;
}) {
  return (
    <div className="py-10 grid place-items-center text-fg-muted">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="animate-pulse">●</span>
        {label}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Falha ao carregar",
  description,
  onRetry,
}: {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="py-10 text-center flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded bg-danger-bg text-danger border border-danger-br grid place-items-center">
        <Icon name="alert" size={16} />
      </div>
      <div className="text-[14px] font-semibold">{title}</div>
      {description && (
        <div className="text-[12px] text-fg-muted max-w-[380px]">
          {description}
        </div>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] text-accent hover:underline"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
