import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { FilteredTable } from "@/components/admin/query-state";
import { ApiError } from "@/lib/api";

function fakeQuery(state: Partial<UseQueryResult<string[]>>): UseQueryResult<string[]> {
  return { refetch: () => Promise.resolve(), ...state } as UseQueryResult<string[]>;
}

const renderRows = ({ rows, emptyMessage }: { rows: string[]; emptyMessage: string }) => (
  <div>
    <input aria-label="filter" />
    <ul>
      {rows.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
    <p>{emptyMessage}</p>
  </div>
);

// Regresia: panel filtrov sa nesmie odmontovať počas načítania ani pri chybe,
// inak používateľ pri písaní stratí focus a po chybe sa nevie vrátiť na platný filter.
describe("FilteredTable", () => {
  it("keeps the toolbar mounted while loading", () => {
    render(
      <FilteredTable query={fakeQuery({ isPending: true, isError: false })}>
        {renderRows}
      </FilteredTable>,
    );

    expect(screen.getByLabelText("filter")).toBeInTheDocument();
    expect(screen.getByText("Načítavam…")).toBeInTheDocument();
  });

  it("keeps the toolbar mounted and shows the error alert on failure", () => {
    const error = new ApiError(422, "invalid_member_status", "Server odmietol zadané údaje.");
    render(
      <FilteredTable query={fakeQuery({ isPending: false, isError: true, error })}>
        {renderRows}
      </FilteredTable>,
    );

    expect(screen.getByLabelText("filter")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Server odmietol zadané údaje.");
  });

  it("renders rows when data is available", () => {
    render(
      <FilteredTable query={fakeQuery({ isPending: false, isError: false, data: ["Jana"] })}>
        {renderRows}
      </FilteredTable>,
    );

    expect(screen.getByText("Jana")).toBeInTheDocument();
    expect(screen.getByText("Žiadne záznamy")).toBeInTheDocument();
  });
});
