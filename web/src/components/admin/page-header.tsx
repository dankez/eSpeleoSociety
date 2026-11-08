import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  pretitle,
  actions,
}: {
  title: string;
  pretitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            eSpeleoSociety
          </Link>
          {pretitle && (
            <>
              <ChevronRight className="size-3" />
              <span>{pretitle}</span>
            </>
          )}
          <ChevronRight className="size-3" />
          <span className="text-foreground">{title}</span>
        </nav>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
