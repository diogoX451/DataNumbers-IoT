import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { cn } from "@/lib/cn";

type Variant = "success" | "error" | "info" | "warn";

type ToastItem = {
  id: string;
  message: string;
  description?: string;
  variant: Variant;
};

type Ctx = {
  toast: (
    message: string,
    options?: { description?: string; variant?: Variant; durationMs?: number },
  ) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

const variantStyle: Record<Variant, string> = {
  success: "border-success-br bg-success-bg text-success",
  error: "border-danger-br bg-danger-bg text-danger",
  info: "border-info-br bg-info-bg text-info",
  warn: "border-warn-br bg-warn-bg text-warn",
};

const variantIcon = {
  success: "checkCircle",
  error: "alert",
  info: "info",
  warn: "alert",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<Ctx["toast"]>(
    (message, opts) => {
      const id = Math.random().toString(36).slice(2);
      const item: ToastItem = {
        id,
        message,
        description: opts?.description,
        variant: opts?.variant ?? "info",
      };
      setItems((prev) => [...prev, item]);
      const dur = opts?.durationMs ?? 4500;
      window.setTimeout(() => dismiss(id), dur);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[360px]"
        role="region"
        aria-label="Notificações"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "border border-border bg-bg-elev rounded-lg shadow-lg p-3 flex items-start gap-2.5 animate-fade-in",
            )}
          >
            <div className={cn("rounded p-1 border", variantStyle[t.variant])}>
              <Icon name={variantIcon[t.variant]} size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-fg">
                {t.message}
              </div>
              {t.description && (
                <div className="text-[12px] text-fg-muted mt-0.5">
                  {t.description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-fg-subtle hover:text-fg p-0.5"
              aria-label="Fechar"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Extrai mensagem de erro útil de respostas do axios. */
export function errorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response;
    if (resp?.data?.error) return resp.data.error;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
