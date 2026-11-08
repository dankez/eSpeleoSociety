import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader, Card } from "@/components/admin/page-header";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { QueryBoundary } from "@/components/admin/query-state";
import { formatDateTime } from "@/lib/labels";
import { useNotifications } from "@/lib/queries";

export const Route = createFileRoute("/notifikacie")({
  head: () => ({
    meta: [
      { title: "Notifikácie · eSpeleoSociety Admin" },
      { name: "description", content: "Prehľad notifikácií zobrazovaných členom." },
    ],
  }),
  component: NotificationsPage,
});

const statusLabel: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Čaká", tone: "warning" },
  sent: { label: "Odoslaná", tone: "success" },
  error: { label: "Chyba", tone: "danger" },
};

function NotificationsPage() {
  const notifications = useNotifications();
  return (
    <>
      <PageHeader title="Notifikácie" pretitle="Komunikácia" />
      <QueryBoundary query={notifications}>
        {(items) => (
          <Card>
            <ul className="divide-y">
              {items.map((n) => {
                const status = statusLabel[n.status] ?? {
                  label: n.status,
                  tone: "neutral" as const,
                };
                return (
                  <li key={n.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                    <span className="flex size-8 items-center justify-center rounded bg-info-soft text-primary">
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{n.text}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        Platí {formatDateTime(n.validFrom)} – {formatDateTime(n.validTo)}
                      </div>
                    </div>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {formatDateTime(n.createdAt)}
                    </span>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Žiadne notifikácie
                </li>
              )}
            </ul>
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
