import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

const PAGES = [
  "/",
  "/clenovia",
  "/kluby",
  "/ecp",
  "/sepa",
  "/notifikacie",
  "/reporty",
  "/nastavenia",
];

// Match routes without running loaders or rendering: only verifies the route table.
describe("App routing", () => {
  it.each(PAGES)("matches a page for %s instead of falling back to not found", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes(path);

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("falls back to the root (not found) for an unknown path", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/neexistuje");

    expect(matches.at(-1)?.routeId).toBe(rootRouteId);
  });
});
