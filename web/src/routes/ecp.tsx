import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, FilterSelect, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { InitialsAvatar } from "@/components/admin/avatar";
import { DemoNotice, FilteredTable } from "@/components/admin/query-state";
import { ecpStatusLabel, ecpStatusTone, formatDate } from "@/lib/labels";
import { useEcpRequests } from "@/lib/queries";
import type { EcpRequest } from "@/lib/schemas";

export const Route = createFileRoute("/ecp")({
  head: () => ({
    meta: [
      { title: "eCP žiadosti · eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Schvaľovanie žiadostí o elektronický jaskyniarsky preukaz.",
      },
    ],
  }),
  component: EcpPage,
});

const APPROVAL_UNAVAILABLE = "Schvaľovanie zatiaľ rieši desktopová aplikácia";

const columns: Column<EcpRequest>[] = [
  {
    key: "id",
    header: "ID žiadosti",
    cell: (r) => <span className="font-mono text-xs">#{r.id}</span>,
  },
  {
    key: "m",
    header: "Člen",
    cell: (r) => (
      <div>
        <div className="font-medium">{r.memberName}</div>
        <div className="text-xs text-muted-foreground">{r.clubName || "—"}</div>
      </div>
    ),
  },
  { key: "d", header: "Dátum žiadosti", cell: (r) => formatDate(r.requestDate) },
  {
    key: "p",
    header: "Fotka",
    cell: (r) => <InitialsAvatar name={r.memberName} seed={r.memberId} square />,
  },
  {
    key: "s",
    header: "Status",
    cell: (r) => (
      <StatusBadge tone={ecpStatusTone[r.status]}>{ecpStatusLabel[r.status]}</StatusBadge>
    ),
  },
  {
    key: "a",
    header: "",
    className: "text-right",
    cell: (r) =>
      r.status === "pending" ? (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="success" className="h-7" disabled title={APPROVAL_UNAVAILABLE}>
            <Check /> Schváliť
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-destructive"
            disabled
            title={APPROVAL_UNAVAILABLE}
          >
            <X /> Zamietnuť
          </Button>
        </div>
      ) : null,
  },
];

function EcpPage() {
  const [status, setStatus] = useState("");
  const requests = useEcpRequests({ status });
  return (
    <>
      <PageHeader title="eCP žiadosti" pretitle="Evidencia" />
      <DemoNotice>
        Zoznam žiadostí je len na čítanie. Schválenie a zamietnutie (podpis QR, nahratie karty,
        e-mail) zatiaľ vykonáva desktopová aplikácia.
      </DemoNotice>
      <FilteredTable query={requests}>
        {({ rows, emptyMessage }) => (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            emptyMessage={emptyMessage}
            toolbar={
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "", label: "Všetky statusy" },
                  { value: "pending", label: ecpStatusLabel.pending },
                  { value: "approved", label: ecpStatusLabel.approved },
                  { value: "rejected", label: ecpStatusLabel.rejected },
                ]}
              />
            }
          />
        )}
      </FilteredTable>
    </>
  );
}
