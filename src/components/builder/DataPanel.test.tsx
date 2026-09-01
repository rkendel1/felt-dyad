import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataPanel } from "./DataPanel";

describe("DataPanel", () => {
  it("falls back to the collection name when displayName is missing", () => {
    render(
      <DataPanel
        collections={[
          {
            name: "customers",
            count: 1,
            fields: [{ name: "id", type: "string" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("customers")).toBeTruthy();
  });

  it("shows an empty state when no app data is available", () => {
    render(<DataPanel collections={[]} />);

    expect(screen.getByText("No data yet")).toBeTruthy();
  });
});
