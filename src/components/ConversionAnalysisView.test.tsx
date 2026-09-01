import { fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversionAnalysisView } from "./ConversionAnalysisView";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }));
vi.mock("./ConversionSummary", () => ({
  ConversionSummary: () => <div>Overview content</div>,
}));
vi.mock("./ConversionDetails", () => ({
  ConversionDetails: () => <div>Detailed content</div>,
}));
vi.mock("./AcceptanceCriteriaReport", () => ({
  AcceptanceCriteriaReport: () => <div>Acceptance content</div>,
}));

describe("ConversionAnalysisView", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: {},
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);
  });

  it("renders only the selected report tab", () => {
    render(<ConversionAnalysisView appId={1} />);

    expect(screen.getByText("Overview content")).toBeTruthy();
    expect(screen.queryByText("Detailed content")).toBeNull();
    expect(screen.queryByText("Acceptance content")).toBeNull();

    const detailsTab = screen.getByRole("tab", { name: "Detailed Analysis" });
    fireEvent.mouseDown(detailsTab, { button: 0, ctrlKey: false });
    expect(detailsTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Detailed content")).toBeTruthy();

    const acceptanceTab = screen.getByRole("tab", {
      name: "Acceptance Criteria",
    });
    fireEvent.mouseDown(acceptanceTab, { button: 0, ctrlKey: false });
    expect(acceptanceTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Acceptance content")).toBeTruthy();
  });
});
