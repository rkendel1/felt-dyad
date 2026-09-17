import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  resolveDirectoryWithinAppPath,
  resolveFileWithinAppPath,
} from "@/pro/main/ipc/handlers/local_agent/tools/path_safety";

describe("resolveDirectoryWithinAppPath", () => {
  it("allows valid subdirectories even if appPath uses forward slashes (Windows)", () => {
    const relativePathFromApp = resolveDirectoryWithinAppPath({
      appPath: "C:/Users/project",
      directory: "src",
    });

    expect(relativePathFromApp).toBe("src");
  });

  it("rejects any '..' segment (Windows)", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "C:/Users/project",
        directory: "src\\..\\src",
      }),
    ).toThrow(/contains "\.\." path traversal segment/);
  });

  it("rejects traversal outside appPath (Windows)", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "C:/Users/project",
        directory: "..\\..\\Windows",
      }),
    ).toThrow(/contains "\.\." path traversal segment/);
  });

  it("rejects absolute paths outside appPath (Windows)", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "C:/Users/project",
        directory: "C:\\Windows",
      }),
    ).toThrow(/escapes the project directory/);
  });

  it("allows valid subdirectories on POSIX paths", () => {
    const relativePathFromApp = resolveDirectoryWithinAppPath({
      appPath: "/Users/project",
      directory: "src",
    });

    expect(relativePathFromApp).toBe("src");
  });

  it("rejects any '..' segment (POSIX)", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "/Users/project",
        directory: "src/../src",
      }),
    ).toThrow(/contains "\.\." path traversal segment/);
  });

  it("rejects traversal outside appPath on POSIX paths", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "/Users/project",
        directory: "../../etc",
      }),
    ).toThrow(/contains "\.\." path traversal segment/);
  });

  it("rejects absolute paths outside appPath on POSIX paths", () => {
    expect(() =>
      resolveDirectoryWithinAppPath({
        appPath: "/Users/project",
        directory: "/etc",
      }),
    ).toThrow(/escapes the project directory/);
  });

  it("allows absolute paths inside appPath on POSIX paths", () => {
    const relativePathFromApp = resolveDirectoryWithinAppPath({
      appPath: "/Users/project",
      directory: "/Users/project/src",
    });

    expect(relativePathFromApp).toBe("src");
  });

  it("removes one redundant app-directory prefix", () => {
    expect(
      resolveDirectoryWithinAppPath({
        appPath: "/Users/apps/eve",
        directory: "eve/packages/eve/src",
      }),
    ).toBe("packages/eve/src");
  });

  it("keeps an exact existing directory that starts with the app name", () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "agent-path-"),
    );
    const appPath = path.join(temporaryDirectory, "eve");
    const exactDirectory = path.join(appPath, "eve", "src");

    try {
      fs.mkdirSync(exactDirectory, { recursive: true });

      expect(
        resolveDirectoryWithinAppPath({
          appPath,
          directory: "eve/src",
        }),
      ).toBe(path.join("eve", "src"));
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

describe("resolveFileWithinAppPath", () => {
  it("resolves a repository-prefixed path to an existing app-relative file", () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "agent-path-"),
    );
    const appPath = path.join(temporaryDirectory, "eve");
    const expectedPath = path.join(
      appPath,
      "packages",
      "eve",
      "src",
      "public",
      "agent.ts",
    );

    try {
      fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
      fs.writeFileSync(expectedPath, "export {};");

      expect(
        resolveFileWithinAppPath({
          appPath,
          filePath: "eve/packages/eve/src/public/agent.ts",
        }),
      ).toEqual({
        fullPath: expectedPath,
        relativePath: "packages/eve/src/public/agent.ts",
      });
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("keeps an exact existing path that starts with the app directory name", () => {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "agent-path-"),
    );
    const appPath = path.join(temporaryDirectory, "eve");
    const exactPath = path.join(appPath, "eve", "agent.ts");

    try {
      fs.mkdirSync(path.dirname(exactPath), { recursive: true });
      fs.writeFileSync(exactPath, "export {};");

      expect(
        resolveFileWithinAppPath({ appPath, filePath: "eve/agent.ts" }),
      ).toEqual({ fullPath: exactPath, relativePath: "eve/agent.ts" });
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("normalizes prefixed destinations for files that do not exist yet", () => {
    expect(
      resolveFileWithinAppPath({
        appPath: "/Users/apps/eve",
        filePath: "eve/src/new-file.ts",
        allowNonExistent: true,
      }),
    ).toEqual({
      fullPath: "/Users/apps/eve/src/new-file.ts",
      relativePath: "src/new-file.ts",
    });
  });

  it("still rejects paths outside the app root", () => {
    expect(() =>
      resolveFileWithinAppPath({
        appPath: "/Users/apps/eve",
        filePath: "eve/../../secrets.txt",
      }),
    ).toThrow(/Unsafe path/);
  });
});
