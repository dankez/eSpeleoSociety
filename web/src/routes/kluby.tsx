import { createFileRoute } from "@tanstack/react-router";
import { Download, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { InitialsAvatar } from "@/components/admin/avatar";
import { QueryBoundary, LoadingRows } from "@/components/admin/query-state";
import { formatDate } from "@/lib/labels";
import { useClubs } from "@/lib/queries";
import type { Club } from "@/lib/schemas";
import { safeHttpUrl } from "@/lib/url";

export const Route = createFileRoute("/kluby")({
  head: () => ({
    meta: [
      { title: "Kluby · eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Zoznam jaskyniarskych klubov, ich prezidentov a počtu členov.",
      },
    ],
  }),
  component: ClubsPage,
});

const columns: Column<Club>[] = [
  {
    key: "logo",
    header: "Logo",
    cell: (c) => <InitialsAvatar name={c.name} seed={c.id} square />,
    className: "w-12",
  },
  { key: "name", header: "Názov", cell: (c) => <span className="font-medium">{c.name}</span> },
  { key: "city", header: "Mesto", cell: (c) => c.city || "—" },
  { key: "pres", header: "Prezident", cell: (c) => c.presidentName || "—" },
  { key: "founded", header: "Dátum založenia", cell: (c) => formatDate(c.foundationDate) },
  {
    key: "count",
    header: "Počet členov",
    cell: (c) => c.memberCount,
    className: "text-right",
  },
  {
    key: "web",
    header: "Web",
    cell: (c) => {
      const href = safeHttpUrl(c.webpage);
      if (!href) return <span className="text-muted-foreground">—</span>;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Globe className="size-3.5" />
          {c.webpage}
        </a>
      );
    },
  },
];

function ClubsPage() {
  const clubs = useClubs();
  return (
    <>
      <PageHeader
        title="Kluby"
        pretitle="Evidencia"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Export zatiaľ nie je k dispozícii">
              <Download /> Export
            </Button>
            <Button size="sm" disabled title="Zakladanie klubov zatiaľ rieši desktopová aplikácia">
              <Plus /> Nový klub
            </Button>
          </>
        }
      />
      <QueryBoundary query={clubs} loading={<LoadingRows rows={8} />}>
        {(rows) => <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} />}
      </QueryBoundary>
    </>
  );
}
