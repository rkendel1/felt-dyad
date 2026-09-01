import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { IS_TEST_BUILD } from "../ipc/utils/test_utils";

/**
 * Gets the base feltdb-apps directory path (without a specific app subdirectory)
 */
export function getFeltDBAppsBaseDirectory(): string {
  if (IS_TEST_BUILD) {
    const electron = getElectron();
    return path.join(electron!.app.getPath("userData"), "feltdb-apps");
  }
  return path.join(os.homedir(), "feltdb-apps");
}

export function getFeltDBAppPath(appPath: string): string {
  // If appPath is already absolute, use it as-is
  if (path.isAbsolute(appPath)) {
    return appPath;
  }
  // Otherwise, use the default base path
  return path.join(getFeltDBAppsBaseDirectory(), appPath);
}

/** Resolve existing relative app records from the current directory first,
 * then the legacy directory. New apps are always created in feltdb-apps. */
export function resolveAppPath(appPath: string): string {
  const currentPath = getFeltDBAppPath(appPath);
  if (path.isAbsolute(appPath) || fs.existsSync(currentPath))
    return currentPath;

  const legacyBase = IS_TEST_BUILD
    ? path.join(getElectron()!.app.getPath("userData"), "dyad-apps")
    : path.join(os.homedir(), "dyad-apps");
  const legacyPath = path.join(legacyBase, appPath);
  return fs.existsSync(legacyPath) ? legacyPath : currentPath;
}

/** @deprecated Use resolveAppPath for stored records or getFeltDBAppPath for creation. */
export const getDyadAppPath = resolveAppPath;

export function getTypeScriptCachePath(): string {
  const electron = getElectron();
  return path.join(electron!.app.getPath("sessionData"), "typescript-cache");
}

/**
 * Gets the user data path, handling both Electron and non-Electron environments
 * In Electron: returns the app's userData directory
 * In non-Electron: returns "./userData" in the current directory
 */

export function getUserDataPath(): string {
  const electron = getElectron();

  // When running in Electron and app is ready
  if (process.env.NODE_ENV !== "development" && electron) {
    return electron!.app.getPath("userData");
  }

  // For development or when the Electron app object isn't available
  return path.resolve("./userData");
}

/**
 * Get a reference to electron in a way that won't break in non-electron environments
 */
export function getElectron(): typeof import("electron") | undefined {
  let electron: typeof import("electron") | undefined;
  try {
    // Check if we're in an Electron environment
    if (process.versions.electron) {
      electron = require("electron");
    }
  } catch {
    // Not in Electron environment
  }
  return electron;
}
