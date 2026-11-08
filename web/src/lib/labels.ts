import type { Tone } from "@/components/admin/status-badge";
import type { EcpRequest, Member } from "@/lib/schemas";

export const memberStatusLabel: Record<Member["status"], string> = {
  applicant: "Uchádzač",
  active: "Aktívny",
  inactive: "Neaktívny",
  blocked: "Zablokovaný",
};

export const memberStatusTone: Record<Member["status"], Tone> = {
  applicant: "info",
  active: "success",
  inactive: "neutral",
  blocked: "warning",
};

export const ecpStatusLabel: Record<EcpRequest["status"], string> = {
  pending: "Čaká",
  approved: "Schválená",
  rejected: "Zamietnutá",
};

export const ecpStatusTone: Record<EcpRequest["status"], Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function memberFullName(m: Pick<Member, "firstName" | "lastName">): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

const dateFormat = new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("sk-SK", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}
