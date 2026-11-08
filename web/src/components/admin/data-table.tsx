import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  editable?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  pageSize = 10,
  toolbar,
  emptyMessage = "Žiadne záznamy",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="card-surface overflow-hidden">
      {toolbar && <div className="flex flex-wrap items-center gap-2 border-b p-3">{toolbar}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("whitespace-nowrap px-3 py-2 font-medium", c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-t transition-colors hover:bg-accent/50",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("whitespace-nowrap px-3 py-2", c.className)}>
                    {c.editable ? (
                      <span
                        className="-mx-1 rounded px-1 py-0.5 hover:ring-1 hover:ring-input"
                        title="Upraviť"
                      >
                        {c.cell(row)}
                      </span>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          Zobrazené {rows.length ? current * pageSize + 1 : 0}–
          {Math.min(rows.length, (current + 1) * pageSize)} z {rows.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="rounded border p-1 disabled:opacity-40"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Predchádzajúca"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                "min-w-7 rounded border px-2 py-1",
                i === current && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="rounded border p-1 disabled:opacity-40"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Ďalšia"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="search"
      className="h-8 w-full max-w-64 rounded border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
    />
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded border border-input bg-card px-2 text-sm outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
