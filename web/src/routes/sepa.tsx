import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Card } from "@/components/admin/page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DemoNotice } from "@/components/admin/query-state";
import { demoSepaPayments, type DemoSepaPayment } from "@/lib/demo-sepa";
import { formatDate } from "@/lib/labels";

export const Route = createFileRoute("/sepa")({
  head: () => ({
    meta: [
      { title: "Import SEPA · eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Import bankového výpisu SEPA a párovanie členských platieb.",
      },
    ],
  }),
  component: SepaPage,
});

const columns: Column<DemoSepaPayment>[] = [
  { key: "date", header: "Dátum", cell: (p) => formatDate(p.date) },
  { key: "vs", header: "VS", cell: (p) => <span className="font-mono text-xs">{p.vs}</span> },
  { key: "payer", header: "Platiteľ", cell: (p) => p.payer },
  {
    key: "iban",
    header: "IBAN",
    cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.iban}</span>,
  },
  { key: "amt", header: "Suma", cell: (p) => `${p.amount.toFixed(2)} €`, className: "text-right" },
  { key: "m", header: "Spárovaný člen", cell: (p) => p.matchedMember ?? "—" },
  {
    key: "s",
    header: "Stav",
    cell: (p) => (
      <StatusBadge tone={p.matchedMember ? "success" : "danger"}>
        {p.matchedMember ? "Spárované" : "Nespárované"}
      </StatusBadge>
    ),
  },
];

function SepaPage() {
  const matched = demoSepaPayments.filter((p) => p.matchedMember);
  const sum = matched.reduce((total, p) => total + p.amount, 0);
  return (
    <>
      <PageHeader
        title="Import SEPA"
        pretitle="Financie"
        actions={
          <Button size="sm" disabled title="Import zatiaľ rieši desktopová aplikácia">
            Importovať platby
          </Button>
        }
      />
      <DemoNotice>
        Náhľad s ukážkovými údajmi. Import bankového výpisu a párovanie platieb zatiaľ vykonáva
        desktopová aplikácia.
      </DemoNotice>
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          aria-disabled="true"
          className="card-surface flex flex-col items-center justify-center gap-2 border-2 border-dashed p-8 text-center opacity-70 lg:col-span-2"
        >
          <UploadCloud className="size-8 text-primary" strokeWidth={1.5} />
          <span className="font-medium">Presuňte sem súbor SEPA (XML / camt.053)</span>
          <span className="text-xs text-muted-foreground">Nahrávanie zatiaľ nie je dostupné</span>
        </div>
        <Card title="Súhrn">
          <dl className="divide-y text-sm">
            {[
              ["Platby v súbore", demoSepaPayments.length],
              ["Spárované", matched.length],
              ["Nespárované", demoSepaPayments.length - matched.length],
              ["Spárovaná suma", `${sum.toFixed(2)} €`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <h2 className="mb-2 mt-6 text-sm font-semibold">Náhľad platieb</h2>
      <DataTable columns={columns} rows={demoSepaPayments} rowKey={(p) => p.vs} />
    </>
  );
}
