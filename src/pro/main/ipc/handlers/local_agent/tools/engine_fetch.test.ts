import { beforeEach, describe, expect, it, vi } from "vitest";

const { readSettings } = vi.hoisted(() => ({
  readSettings: vi.fn(),
}));

vi.mock("@/main/settings", () => ({ readSettings }));

import { hasManagedAiApiKey } from "./engine_fetch";
import { editFileTool } from "./edit_file";
import { searchReplaceTool } from "./search_replace";

describe("local agent file-edit tool selection", () => {
  beforeEach(() => {
    readSettings.mockReset();
  });

  it("uses local search-replace when no managed AI key is configured", () => {
    readSettings.mockReturnValue({ providerSettings: {} });

    expect(hasManagedAiApiKey()).toBe(false);
    expect(editFileTool.isEnabled?.({} as never)).toBe(false);
    expect(searchReplaceTool.isEnabled?.({} as never)).toBe(true);
  });

  it("uses hosted turbo edits when a managed AI key is configured", () => {
    readSettings.mockReturnValue({
      providerSettings: { auto: { apiKey: { value: "managed-key" } } },
    });

    expect(hasManagedAiApiKey()).toBe(true);
    expect(editFileTool.isEnabled?.({} as never)).toBe(true);
    expect(searchReplaceTool.isEnabled?.({} as never)).toBe(false);
  });
});
