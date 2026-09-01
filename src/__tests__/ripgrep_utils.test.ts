import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => process.cwd() },
}));

describe("getRgExecutablePath", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("resolves the platform-specific @vscode/ripgrep binary", async () => {
    const executable = process.platform === "win32" ? "rg.exe" : "rg";
    const expected = path.join(
      process.cwd(),
      "node_modules",
      "@vscode",
      `ripgrep-${process.platform}-${process.arch}`,
      "bin",
      executable,
    );
    expect(fs.existsSync(expected)).toBe(true);

    const { getRgExecutablePath } = await import("../ipc/utils/ripgrep_utils");
    expect(getRgExecutablePath()).toBe(expected);
  });
});
