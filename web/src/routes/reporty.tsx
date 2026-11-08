import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, Card } from "@/components/admin/page-header";
import { QueryBoundary } from "@/components/admin/query-state";
import { useStats } from "@/lib/queries";

export const Route = createFileRoute("/reporty")({
  head: () => ({
    meta: [
      { title: "Reporty · eSpeleoSociety Admin" },
      { name: "description", content: "Reporty členov podľa klubov a zaplatených poplatkov." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const stats = useStats();
  return (
    <>
      <PageHeader
        title="Reporty"
        actions={
          <Button variant="outline" size="sm" disabled title="Export zatiaľ nie je k dispozícii">
            <Download /> Export
          </Button>
        }
      />
      <QueryBoundary query={stats}>
        {(s) => {
          const percent = s.memberCount ? (s.paidMemberCount / s.memberCount) * 100 : 0;
          return (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card title={`Poplatky ${s.year}`}>
                <div className="space-y-4 p-4">
                  <div className="text-3xl font-semibold">{Math.round(percent)} %</div>
                  <Progress value={percent} />
                  <div className="flex justify-between text-sm">
                    <span className="text-success">Zaplatené: {s.paidMemberCount}</span>
                    <span className="text-destructive">Nezaplatené: {s.unpaidMemberCount}</span>
                  </div>
                </div>
              </Card>
              <Card title="Členovia podľa klubov a poplatkov" className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Klub</th>
                      <th className="px-4 py-2 text-right font-medium">Členovia</th>
                      <th className="px-4 py-2 text-right font-medium">Zaplatené</th>
                      <th className="px-4 py-2 text-right font-medium">Nezaplatené</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.membersPerClub.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-accent/50">
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-right">{c.memberCount}</td>
                        <td className="px-4 py-2 text-right text-success">{c.paidMemberCount}</td>
                        <td className="px-4 py-2 text-right text-destructive">
                          {c.memberCount - c.paidMemberCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
