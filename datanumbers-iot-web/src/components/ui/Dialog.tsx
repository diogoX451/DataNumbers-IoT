import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { cn } from "@/lib/cn";

/**
 * Diálogo modal acessível. Usa portal implícito (renderiza no nível
 * onde for chamado, mas com `fixed inset-0` cobre a tela) e fecha em
 * Escape + clique no backdrop.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-bg-elev border border-border rounded-lg shadow-lg w-full animate-fade-in",
          widthClass,
        )}
      >
        <header className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold m-0">{title}</h2>
            )}
            {description && (
              <p className="text-[12px] text-fg-muted m-0 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg w-7 h-7 grid place-items-center rounded hover:bg-bg-hover"
            aria-label="Fechar"
          >
            <Icon name="x" size={14} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-border flex gap-2 justify-end bg-bg-subtle/40">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
