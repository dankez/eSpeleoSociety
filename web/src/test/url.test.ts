import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "@/lib/url";

describe("safeHttpUrl", () => {
  it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>", "vbscript:x"])(
    "rejects the unsafe scheme in %s",
    (value) => {
      expect(safeHttpUrl(value)).toBeUndefined();
    },
  );

  it("returns undefined for empty or whitespace input", () => {
    expect(safeHttpUrl("")).toBeUndefined();
    expect(safeHttpUrl("   ")).toBeUndefined();
  });

  it("keeps http and https URLs", () => {
    expect(safeHttpUrl("https://example.sk/klub")).toBe("https://example.sk/klub");
    expect(safeHttpUrl("http://example.sk")).toBe("http://example.sk/");
  });

  it("rejects URLs with embedded credentials used to disguise the target host", () => {
    expect(safeHttpUrl("https://speleo.sk@evil.example")).toBeUndefined();
    expect(safeHttpUrl("https://user:pass@example.sk")).toBeUndefined();
  });

  it("assumes https for a bare domain", () => {
    expect(safeHttpUrl("www.speleo.sk")).toBe("https://www.speleo.sk/");
  });
});
