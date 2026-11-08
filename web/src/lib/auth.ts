import { useSyncExternalStore } from "react";

// Bearer token žije len v pamäti: po obnovení stránky sa zadáva znova. Zámerne sa neukladá do
// localStorage/sessionStorage, aby ho nemohol vyčítať žiadny skript. Plnohodnotné OAuth2
// prihlásenie rieši docs/api-oauth2-migration-plan.md.
let token: string | null = null;
const listeners = new Set<() => void>();

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useToken(): string | null {
  return useSyncExternalStore(subscribe, getToken, getToken);
}
