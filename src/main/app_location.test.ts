import { describe, expect, it } from "vitest";
import { shouldPromptMoveToApplications } from "./app_location";

describe("shouldPromptMoveToApplications", () => {
  it("does not prompt during local development", () => {
    expect(
      shouldPromptMoveToApplications({
        isPackaged: false,
        isTestBuild: false,
        platform: "darwin",
        isInApplicationsFolder: false,
      }),
    ).toBe(false);
  });

  it("prompts for a packaged macOS install only", () => {
    expect(
      shouldPromptMoveToApplications({
        isPackaged: true,
        isTestBuild: false,
        platform: "darwin",
        isInApplicationsFolder: false,
      }),
    ).toBe(true);
  });
});
