import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/layout/Sidebar";
import { isAuthenticated, isTokenExpired } from "@/lib/auth";

/**
 * Layout pra todas as rotas autenticadas: sidebar fixa + área principal.
 *
 * `beforeLoad` é o guard de auth: se não há token (ou está expirado), o
 * router redireciona para /sign-in preservando a rota original em
 * `search.redirect`.
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated() || isTokenExpired()) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="grid grid-cols-[var(--sidebar-w)_1fr] min-h-screen">
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
