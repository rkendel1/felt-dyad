/**
 * Shared utilities for ripgrep integration
 */

import { app } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export const MAX_FILE_SEARCH_SIZE = 1024 * 1024;
export const RIPGREP_EXCLUDED_GLOBS = [
  "!node_modules/**",
  "!.git/**",
  "!.next/**",
];

/**
 * Get the path to the ripgrep executable.
 * Handles both development and packaged Electron app scenarios.
 */
export function getRgExecutablePath(): string {
  const isWindows = os.platform() === "win32";
  const executableName = isWindows ? "rg.exe" : "rg";
  const platformPackage = `ripgrep-${process.platform}-${process.arch}`;
  const packageRoot = app.isPackaged
    ? path.join(process.resourcesPath, "@vscode")
    : path.join(app.getAppPath(), "node_modules", "@vscode");
  const candidates = [
    path.join(packageRoot, platformPackage, "bin", executableName),
    // @vscode/ripgrep <= 1.17 used this non-platform-specific layout.
    path.join(packageRoot, "ripgrep", "bin", executableName),
  ];

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next supported package layout.
    }
  }

  // Let spawn resolve a system installation from PATH when optional npm
  // dependencies were intentionally omitted.
  return executableName;
}
