import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Údaje sa nepodarilo načítať.";
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="card-surface flex items-center gap-3 border-destructive/40 p-4 text-sm"
    >
      <AlertCircle className="size-5 shrink-0 text-destructive" />
      <span className="flex-1">{errorMessage(error)}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Skúsiť znova
        </Button>
      )}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card-surface space-y-2 p-4" aria-busy="true" aria-label="Načítavam">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

/** Zjednotené vykreslenie stavov dotazu: načítavanie, chyba, dáta. */
export function QueryBoundary<T>({
  query,
  children,
  loading,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  loading?: React.ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <LoadingRows />}</>;
  if (query.isError)
    return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}

/**
 * Tabuľka s filtrami, ktorej panel filtrov ostáva namontovaný počas načítavania aj pri chybe,
 * takže používateľ nestratí focus ani možnosť vrátiť sa na platný filter.
 */
export function FilteredTable<T>({
  query,
  children,
}: {
  query: UseQueryResult<T[]>;
  children: (props: { rows: T[]; emptyMessage: string }) => React.ReactNode;
}) {
  const emptyMessage = query.isPending ? "Načítavam…" : "Žiadne záznamy";
  return (
    <>
      {query.isError && (
        <div className="mb-3">
          <ErrorNotice error={query.error} onRetry={() => void query.refetch()} />
        </div>
      )}
      {children({ rows: query.data ?? [], emptyMessage })}
    </>
  );
}

/** Označenie obrazoviek, ktoré zatiaľ nie sú napojené na API. */
export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
      {children}
    </div>
  );
}
