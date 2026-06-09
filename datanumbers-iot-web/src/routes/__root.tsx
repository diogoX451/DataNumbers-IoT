import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { QueryClient } from "@tanstack/react-query";

const TanStackRouterDevtools =
  import.meta.env.DEV
    ? lazy(() =>
        import("@tanstack/router-devtools").then((m) => ({
          default: m.TanStackRouterDevtools,
        })),
      )
    : () => null;

const ReactQueryDevtools =
  import.meta.env.DEV
    ? lazy(() =>
        import("@tanstack/react-query-devtools").then((m) => ({
          default: m.ReactQueryDevtools,
        })),
      )
    : () => null;

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" />
      </Suspense>
    </>
  ),
});
