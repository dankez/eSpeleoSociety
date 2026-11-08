import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchAll, fetchJson, fetchPage } from "@/lib/api";
import {
  clubSchema,
  ecpRequestSchema,
  memberDetailSchema,
  memberSchema,
  notificationListSchema,
  statsSchema,
  type EcpRequest,
} from "@/lib/schemas";

export type MemberFilters = {
  q: string;
  clubId: string;
  status: string;
  paid: string;
};

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: ({ signal }) => fetchJson("/api/v1/stats", statsSchema, {}, signal),
  });
}

export function useClubs() {
  return useQuery({
    queryKey: ["clubs"],
    queryFn: ({ signal }) => fetchAll("/api/v1/clubs", clubSchema, {}, signal),
  });
}

export function useMembers(filters: MemberFilters) {
  return useQuery({
    queryKey: ["members", filters],
    queryFn: ({ signal }) => fetchAll("/api/v1/members", memberSchema, filters, signal),
    // Pri zmene filtra ostáva viditeľný predošlý výsledok, aby sa nepreblikla tabuľka.
    placeholderData: keepPreviousData,
  });
}

export function useMemberDetail(memberId: number | null) {
  return useQuery({
    queryKey: ["member", memberId],
    enabled: memberId !== null,
    queryFn: ({ signal }) =>
      fetchJson(`/api/v1/members/${memberId}`, memberDetailSchema, {}, signal),
  });
}

export function useEcpRequests(options: { status?: string; limit?: number } = {}) {
  const { status, limit } = options;
  return useQuery<EcpRequest[]>({
    queryKey: ["ecp-requests", { status, limit }],
    queryFn: ({ signal }) =>
      limit
        ? fetchPage("/api/v1/ecp-requests", ecpRequestSchema, { status, limit }, signal)
        : fetchAll("/api/v1/ecp-requests", ecpRequestSchema, { status }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async ({ signal }) =>
      (await fetchJson("/api/v1/notifications", notificationListSchema, {}, signal)).items,
  });
}
