import { QueryClient } from "@tanstack/react-query";

/**
 * Defaults conservadores: cache de 30s, sem refetch automático on focus
 * (telemetria já chega via WS, então o refetch de QueryClient é exagero).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
