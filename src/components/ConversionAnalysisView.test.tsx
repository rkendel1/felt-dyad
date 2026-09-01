import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversionAnalysisView } from "./ConversionAnalysisView";

const { approvePlan } = vi.hoisted(() => ({ approvePlan: vi.fn() }));

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
vi.mock("@/hooks/useConversionExecution", () => ({
  useApproveConversion: () => ({
    mutateAsync: approvePlan,
    isPending: false,
  }),
}));

describe("ConversionAnalysisView", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: { status: "PENDING_APPROVAL" },
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

  it("requires confirmation before approving the conversion", async () => {
    approvePlan.mockResolvedValue({ success: true });
    render(<ConversionAnalysisView appId={42} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Approve FeltDB conversion" }),
    );
    expect(
      screen.getByText("Approve this FeltDB conversion plan?"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    await waitFor(() => expect(approvePlan).toHaveBeenCalledWith(42));
    await waitFor(() =>
      expect(
        screen.queryByText("Approve this FeltDB conversion plan?"),
      ).toBeNull(),
    );
  });
});
