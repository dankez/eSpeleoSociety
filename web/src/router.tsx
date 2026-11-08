import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { ApiError } from "@/lib/api";
import { routeTree } from "./routeTree.gen";

const MAX_RETRIES = 2;

// Chyby 4xx (neplatný token, chýbajúce oprávnenie, zlé filtre) sa opakovaním nevyriešia,
// takže sa nezdržuje zobrazenie chyby. Opakujú sa len sieťové a serverové chyby.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export const getRouter = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });

  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Čerstvosť dát rieši Query; caching sa nastavuje na QueryClient, nie na routeri.
    defaultPreloadStaleTime: 0,
  });
};
