import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, memberFullName } from "@/lib/labels";

describe("labels", () => {
  it("formats missing and invalid dates as a dash", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });

  it("formats a valid ISO date", () => {
    expect(formatDate("2026-11-01")).toMatch(/2026/);
  });

  it("joins first and last name without stray spaces", () => {
    expect(memberFullName({ firstName: "Jana", lastName: "Kováčová" })).toBe("Jana Kováčová");
    expect(memberFullName({ firstName: "", lastName: "Kováčová" })).toBe("Kováčová");
  });
});
