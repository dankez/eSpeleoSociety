import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CreditCard, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Card } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { InitialsAvatar } from "@/components/admin/avatar";
import { ErrorNotice, QueryBoundary } from "@/components/admin/query-state";
import { ecpStatusLabel, ecpStatusTone, formatDate } from "@/lib/labels";
import { useEcpRequests, useStats } from "@/lib/queries";
import type { Stats } from "@/lib/schemas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prehľad · eSpeleoSociety Admin" },
      { name: "description", content: "Prehľad členov, klubov, poplatkov a eCP žiadostí." },
    ],
  }),
  component: Dashboard,
});

const RECENT_REQUESTS = 6;
const CLUB_NAME_PREFIX = /^(Speleoklub|Speleo|Jaskyniarsky klub|Jaskyniarska skupina) /;

function Dashboard() {
  const stats = useStats();
  return (
    <>
      <PageHeader title="Prehľad" />
      <QueryBoundary query={stats}>{(data) => <StatsSection stats={data} />}</QueryBoundary>
    </>
  );
}

function StatsSection({ stats }: { stats: Stats }) {
  const recent = useEcpRequests({ limit: RECENT_REQUESTS });
  const paidPercent = stats.memberCount
    ? Math.round((stats.paidMemberCount / stats.memberCount) * 100)
    : 0;
  const chart = stats.membersPerClub.map((c) => ({
    name: c.name.replace(CLUB_NAME_PREFIX, ""),
    clenovia: c.memberCount,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Počet členov" value={stats.memberCount} />
        <KpiCard icon={Building2} label="Počet klubov" value={stats.clubCount} />
        <KpiCard
          icon={Wallet}
          label={`Zaplatené členské ${stats.year}`}
          value={`${stats.paidMemberCount} / ${stats.memberCount}`}
          hint={`${paidPercent} % členov`}
        />
        <KpiCard
          icon={CreditCard}
          label="Čakajúce eCP žiadosti"
          value={stats.pendingEcpRequestCount}
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card title="Členovia podľa klubov" className="lg:col-span-3">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: 0, bottom: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="clenovia"
                  name="Členovia"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card
          title="Posledné eCP žiadosti"
          className="lg:col-span-2"
          actions={
            <Link to="/ecp" className="text-xs text-primary hover:underline">
              Zobraziť všetky
            </Link>
          }
        >
          {recent.isError ? (
            <div className="p-4">
              <ErrorNotice error={recent.error} onRetry={() => void recent.refetch()} />
            </div>
          ) : (
            <ul className="divide-y">
              {(recent.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <InitialsAvatar name={r.memberName} seed={r.memberId} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.memberName}</div>
                    <div className="text-xs text-muted-foreground">
                      #{r.id} · {formatDate(r.requestDate)}
                    </div>
                  </div>
                  <StatusBadge tone={ecpStatusTone[r.status]}>
                    {ecpStatusLabel[r.status]}
                  </StatusBadge>
                </li>
              ))}
              {recent.isSuccess && recent.data.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Žiadne žiadosti
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
