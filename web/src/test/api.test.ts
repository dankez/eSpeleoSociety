import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, MAX_PAGES, fetchAll, fetchJson } from "@/lib/api";
import { getToken, setToken } from "@/lib/auth";

const itemSchema = z.object({ id: z.number() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchJson", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    setToken("secret-token");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    setToken(null);
  });

  it("rejects without calling the network when no token is set", async () => {
    setToken(null);

    await expect(fetchJson("/api/v1/stats", itemSchema)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the bearer token and drops empty query params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

    await fetchJson("/api/v1/members", itemSchema, { q: "", status: "active", cursor: null });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/members?status=active");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer secret-token");
  });

  it("clears the token on 401 so the login gate reappears", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: "invalid_bearer_token" } }, 401));

    await expect(fetchJson("/api/v1/stats", itemSchema)).rejects.toMatchObject({
      status: 401,
      code: "invalid_bearer_token",
    });
    expect(getToken()).toBeNull();
  });

  it("keeps the token on 403", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: "forbidden" } }, 403));

    await expect(fetchJson("/api/v1/stats", itemSchema)).rejects.toMatchObject({ status: 403 });
    expect(getToken()).toBe("secret-token");
  });

  it("fails with invalid_response when the payload does not match the schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "not-a-number" }));

    await expect(fetchJson("/api/v1/stats", itemSchema)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("maps a network failure to a readable ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await fetchJson("/api/v1/stats", itemSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "network_error" });
  });

  it("does not leak server error details into the message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "boom", message: "SELECT * FROM members" } }, 500),
    );

    const error = (await fetchJson("/api/v1/stats", itemSchema).catch(
      (e: unknown) => e,
    )) as ApiError;

    expect(error.message).not.toContain("SELECT");
  });
});

describe("fetchAll", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    setToken("secret-token");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    setToken(null);
  });

  it("follows the cursor until the last page and concatenates items", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 1 }], nextCursor: "c1" }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 2 }], nextCursor: null }));

    const items = await fetchAll("/api/v1/clubs", itemSchema);

    expect(items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("cursor=c1");
  });

  it("stops with an error instead of looping forever on a runaway cursor", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [{ id: 1 }], nextCursor: "again" })),
    );

    await expect(fetchAll("/api/v1/clubs", itemSchema)).rejects.toMatchObject({
      code: "too_many_pages",
    });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_PAGES);
  });
});
