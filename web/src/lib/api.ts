import type { z } from "zod";
import { getToken, setToken } from "@/lib/auth";
import { errorBodySchema, pageSchema } from "@/lib/schemas";

export const PAGE_LIMIT = 200;
export const MAX_PAGES = 25;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

const UNAUTHORIZED_MESSAGE = "Prihlásenie vypršalo alebo token nie je platný.";

const STATUS_MESSAGES: Record<number, string> = {
  401: UNAUTHORIZED_MESSAGE,
  403: "Na túto operáciu nemáte oprávnenie.",
  404: "Záznam sa nenašiel.",
  422: "Server odmietol zadané údaje.",
};

function buildUrl(path: string, query: QueryParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = "http_error";
  try {
    const parsed = errorBodySchema.safeParse(await response.json());
    if (parsed.success) code = parsed.data.error.code;
  } catch {
    // Telo chyby je len doplnková informácia; stav HTTP stačí na zrozumiteľnú správu.
  }
  const message = STATUS_MESSAGES[response.status] ?? `Server vrátil chybu ${response.status}.`;
  return new ApiError(response.status, code, message);
}

export async function fetchJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  query: QueryParams = {},
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  const token = getToken();
  if (!token) throw new ApiError(401, "missing_bearer_token", UNAUTHORIZED_MESSAGE);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: signal ?? null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "Server sa nepodarilo kontaktovať.");
  }

  if (!response.ok) {
    // Neplatný token sa zahodí, aby sa zobrazilo znovu zadanie tokenu. Ak sa medzitým
    // prihlásil niekto iný, oneskorená 401 zo starého tokenu nesmie zmazať nový.
    if (response.status === 401 && getToken() === token) setToken(null);
    throw await toApiError(response);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      "invalid_response",
      "Server vrátil neočakávaný tvar údajov.",
    );
  }
  return parsed.data;
}

/** Načíta všetky stránky kurzorovej paginácie. UI stránkuje v tabuľke na klientovi. */
export async function fetchAll<S extends z.ZodTypeAny>(
  path: string,
  itemSchema: S,
  query: QueryParams = {},
  signal?: AbortSignal,
): Promise<z.infer<S>[]> {
  const schema = pageSchema(itemSchema);
  const items: z.infer<S>[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body: z.infer<typeof schema> = await fetchJson(
      path,
      schema,
      { ...query, limit: PAGE_LIMIT, cursor },
      signal,
    );
    items.push(...body.items);
    if (!body.nextCursor) return items;
    cursor = body.nextCursor;
  }
  throw new ApiError(0, "too_many_pages", "Záznamov je príliš veľa na zobrazenie naraz.");
}

export async function fetchPage<S extends z.ZodTypeAny>(
  path: string,
  itemSchema: S,
  query: QueryParams = {},
  signal?: AbortSignal,
): Promise<z.infer<S>[]> {
  const body = await fetchJson(path, pageSchema(itemSchema), query, signal);
  return body.items;
}
