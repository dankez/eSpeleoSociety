import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, SearchInput, FilterSelect, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { InitialsAvatar } from "@/components/admin/avatar";
import { ErrorNotice, FilteredTable, LoadingRows } from "@/components/admin/query-state";
import { formatDate, memberFullName, memberStatusLabel, memberStatusTone } from "@/lib/labels";
import { useClubs, useMemberDetail, useMembers } from "@/lib/queries";
import type { Member } from "@/lib/schemas";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/clenovia")({
  head: () => ({
    meta: [
      { title: "Členovia · eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Zoznam členov speleologickej spoločnosti s filtrami a detailom.",
      },
    ],
  }),
  component: MembersPage,
});

const SEARCH_DEBOUNCE_MS = 300;

const yesNo = (v: boolean, yes = "Áno") => (
  <StatusBadge tone={v ? "success" : "neutral"}>{v ? yes : "Nie"}</StatusBadge>
);

const columns: Column<Member>[] = [
  {
    key: "avatar",
    header: "",
    cell: (m) => <InitialsAvatar name={memberFullName(m)} seed={m.id} />,
    className: "w-10",
  },
  { key: "tp", header: "Titul pred", cell: (m) => m.titlePrefix || "—" },
  {
    key: "fn",
    header: "Meno",
    cell: (m) => <span className="font-medium">{m.firstName}</span>,
  },
  {
    key: "ln",
    header: "Priezvisko",
    cell: (m) => <span className="font-medium">{m.lastName}</span>,
  },
  { key: "tz", header: "Titul za", cell: (m) => m.titleSuffix || "—" },
  { key: "club", header: "Klub", cell: (m) => m.primaryClubName || "—" },
  {
    key: "email",
    header: "E-mail",
    cell: (m) => <span className="text-muted-foreground">{m.email || "—"}</span>,
  },
  { key: "phone", header: "Telefón", cell: (m) => m.phone || "—" },
  {
    key: "status",
    header: "Status",
    cell: (m) => (
      <StatusBadge tone={memberStatusTone[m.status]}>{memberStatusLabel[m.status]}</StatusBadge>
    ),
  },
  {
    key: "paid",
    header: "Poplatok",
    cell: (m) => (
      <StatusBadge tone={m.hasPaidCurrentYearFee ? "success" : "danger"}>
        {m.hasPaidCurrentYearFee ? "Zaplatený" : "Nezaplatený"}
      </StatusBadge>
    ),
  },
  {
    key: "pres",
    header: "Prezident klubu",
    cell: (m) =>
      m.isPresident ? (
        <StatusBadge tone="info">Prezident</StatusBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  { key: "disc", header: "Zľavnené", cell: (m) => yesNo(m.discountedMembership) },
];

function MembersPage() {
  const [q, setQ] = useState("");
  const [clubId, setClubId] = useState("");
  const [status, setStatus] = useState("");
  const [paid, setPaid] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const debouncedQ = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS);
  const members = useMembers({ q: debouncedQ, clubId, status, paid });
  const clubs = useClubs();

  return (
    <>
      <PageHeader
        title="Členovia"
        pretitle="Evidencia"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Export zatiaľ nie je k dispozícii">
              <Download /> Export
            </Button>
            <Button size="sm" disabled title="Zakladanie členov zatiaľ rieši desktopová aplikácia">
              <Plus /> Nový člen
            </Button>
          </>
        }
      />
      <FilteredTable query={members}>
        {({ rows, emptyMessage }) => (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(m) => m.id}
            emptyMessage={emptyMessage}
            onRowClick={(m) => setSelectedId(m.id)}
            toolbar={
              <>
                <SearchInput
                  placeholder="Hľadať meno, e-mail alebo klub…"
                  aria-label="Hľadať člena"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <FilterSelect
                  label="Klub"
                  value={clubId}
                  onChange={setClubId}
                  options={[
                    { value: "", label: "Všetky kluby" },
                    ...(clubs.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                />
                <FilterSelect
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "", label: "Všetky statusy" },
                    { value: "active", label: memberStatusLabel.active },
                    { value: "inactive", label: memberStatusLabel.inactive },
                    { value: "applicant", label: memberStatusLabel.applicant },
                    { value: "blocked", label: memberStatusLabel.blocked },
                  ]}
                />
                <FilterSelect
                  label="Poplatok"
                  value={paid}
                  onChange={setPaid}
                  options={[
                    { value: "", label: "Zaplatené aj nezaplatené" },
                    { value: "true", label: "Zaplatené" },
                    { value: "false", label: "Nezaplatené" },
                  ]}
                />
              </>
            }
          />
        )}
      </FilteredTable>
      <MemberSheet memberId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

function MemberSheet({ memberId, onClose }: { memberId: number | null; onClose: () => void }) {
  // Posledné otvorené ID sa drží, aby obsah nezmizol počas animácie zatvárania panela.
  const [shownId, setShownId] = useState<number | null>(memberId);
  if (memberId !== null && memberId !== shownId) setShownId(memberId);

  const detail = useMemberDetail(shownId);
  const member = detail.data;

  return (
    <Sheet open={memberId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {!member && (
          <SheetHeader>
            <SheetTitle>Detail člena</SheetTitle>
            <SheetDescription className="sr-only">Údaje vybraného člena</SheetDescription>
          </SheetHeader>
        )}
        {detail.isPending && shownId !== null && <LoadingRows rows={5} />}
        {detail.isError && (
          <ErrorNotice error={detail.error} onRetry={() => void detail.refetch()} />
        )}
        {member && (
          <>
            <SheetHeader className="items-center text-center">
              <InitialsAvatar name={memberFullName(member)} seed={member.id} size="lg" square />
              <SheetTitle>
                {[member.titlePrefix, memberFullName(member)].filter(Boolean).join(" ")}
                {member.titleSuffix && `, ${member.titleSuffix}`}
              </SheetTitle>
              <SheetDescription>{member.primaryClubName || "Bez klubu"}</SheetDescription>
              <div className="flex gap-1.5">
                <StatusBadge tone={memberStatusTone[member.status]}>
                  {memberStatusLabel[member.status]}
                </StatusBadge>
                {member.isPresident && <StatusBadge tone="info">Prezident</StatusBadge>}
              </div>
            </SheetHeader>
            <dl className="mt-6 divide-y rounded border text-sm">
              {(
                [
                  ["Ulica", member.address.street],
                  ["Mesto", member.address.city],
                  ["PSČ", member.address.zipCode],
                  ["Krajina", member.address.country],
                  ["E-mail", member.email],
                  ["Telefón", member.phone],
                  ["Platnosť eCP do", member.hasEcp ? formatDate(member.ecpValidUntil) : "Bez eCP"],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
