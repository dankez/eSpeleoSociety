import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { shouldRetry } from "@/router";

describe("shouldRetry", () => {
  it.each([401, 403, 404, 422])("does not retry a %i client error", (status) => {
    expect(shouldRetry(0, new ApiError(status, "x", "x"))).toBe(false);
  });

  it("retries network and server errors a bounded number of times", () => {
    expect(shouldRetry(0, new ApiError(0, "network_error", "x"))).toBe(true);
    expect(shouldRetry(1, new ApiError(500, "x", "x"))).toBe(true);
    expect(shouldRetry(2, new ApiError(500, "x", "x"))).toBe(false);
  });

  it("retries unknown errors", () => {
    expect(shouldRetry(0, new Error("boom"))).toBe(true);
  });
});
