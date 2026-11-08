/** Vráti URL len pre http(s); iné schémy (javascript:, data:) sa nikdy nevykreslia ako odkaz. */
export function safeHttpUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    const isWeb = parsed.protocol === "http:" || parsed.protocol === "https:";
    // URL s prihlasovacími údajmi (https://user:pass@host) sa používa na maskovanie cieľa.
    if (!isWeb || parsed.username || parsed.password) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}
