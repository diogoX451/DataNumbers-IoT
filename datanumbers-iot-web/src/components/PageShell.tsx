import type { ReactNode } from "react";
import { Topbar, type Crumb } from "@/layout/Topbar";

/**
 * Container das páginas autenticadas: monta o Topbar com breadcrumbs
 * recebidos como prop e envolve o conteúdo no padding padrão.
 *
 * O motivo de não embutir no `_app` é deixar cada página declarar suas
 * próprias crumbs (ex.: detalhe de device precisa puxar o nome).
 */
export function PageShell({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: ReactNode;
}) {
  return (
    <>
      <Topbar crumbs={crumbs} />
      <div className="px-7 py-6 pb-20 w-full max-w-[1380px]">{children}</div>
    </>
  );
}
