import fs from "node:fs";
import path from "node:path";
import { safeJoin } from "@/ipc/utils/path_utils";
import { normalizePath } from "../../../../../../../shared/normalizePath";

function stripAppDirectoryPrefix(appPath: string, requestedPath: string) {
  const normalized = normalizePath(requestedPath).replace(/^\.\/+/, "");
  const [firstSegment, ...remainingSegments] = normalized.split("/");
  const looksLikeWin32Path =
    /^[a-zA-Z]:[\\/]/.test(appPath) ||
    appPath.startsWith("\\\\") ||
    appPath.includes("\\");
  const pathImpl = looksLikeWin32Path ? path.win32 : path.posix;
  const appDirectory = pathImpl.basename(pathImpl.resolve(appPath));
  const matchesAppDirectory = looksLikeWin32Path
    ? firstSegment.toLowerCase() === appDirectory.toLowerCase()
    : firstSegment === appDirectory;

  return matchesAppDirectory && remainingSegments.length > 0
    ? remainingSegments.join("/")
    : normalized;
}

/**
 * Resolve a tool-supplied file path within an app root.
 *
 * Tool paths are app-relative, but models sometimes copy the app directory
 * name from surrounding context (for example `eve/src/App.tsx`). Prefer an
 * exact existing path, then retry without that one redundant root segment.
 */
export function resolveFileWithinAppPath(params: {
  appPath: string;
  filePath: string;
  allowNonExistent?: boolean;
}): { fullPath: string; relativePath: string } {
  const normalized = normalizePath(params.filePath).replace(/^\.\/+/, "");
  const directPath = safeJoin(params.appPath, normalized);
  if (fs.existsSync(directPath)) {
    return { fullPath: directPath, relativePath: normalized };
  }

  const stripped = stripAppDirectoryPrefix(params.appPath, normalized);
  if (stripped !== normalized) {
    const strippedPath = safeJoin(params.appPath, stripped);
    if (params.allowNonExistent || fs.existsSync(strippedPath)) {
      return { fullPath: strippedPath, relativePath: stripped };
    }
  }

  return { fullPath: directPath, relativePath: normalized };
}

/**
 * Resolve and validate that `directory` stays within `appPath`.
 *
 * Why not `startsWith`?
 * - On Windows, `path.resolve` normalizes to backslashes, while stored `appPath`
 *   values may contain forward slashes. A string `startsWith` check can then
 *   falsely reject valid subdirectories.
 *
 * This uses `path.relative` instead, and treats Windows paths as case-insensitive.
 */
export function resolveDirectoryWithinAppPath(params: {
  appPath: string;
  directory: string;
}): string {
  // Disallow any ".." path segment (even if the resolved path would remain within root).
  // This makes path traversal attempts explicit and avoids surprising "a/../b" style inputs.
  if (/(^|[\\/])\.\.([\\/]|$)/.test(params.directory)) {
    throw new Error(
      `Invalid directory path: "${params.directory}" contains ".." path traversal segment`,
    );
  }

  // We sometimes persist Windows paths with forward slashes (e.g. "C:/..."),
  // so detect win32-style roots and use win32 semantics for the safety check.
  const looksLikeWin32Path =
    /^[a-zA-Z]:[\\/]/.test(params.appPath) ||
    params.appPath.startsWith("\\\\") ||
    params.appPath.includes("\\");

  const pathImpl = looksLikeWin32Path ? path.win32 : path.posix;
  const caseInsensitive = looksLikeWin32Path;

  const resolvedAppPath = pathImpl.resolve(params.appPath);
  const normalizedDirectory = normalizePath(params.directory).replace(
    /^\.\/+/,
    "",
  );
  const directPath = pathImpl.resolve(resolvedAppPath, normalizedDirectory);
  const directory = fs.existsSync(directPath)
    ? normalizedDirectory
    : stripAppDirectoryPrefix(params.appPath, normalizedDirectory);
  const resolvedPath = pathImpl.resolve(resolvedAppPath, directory);

  const appForCheck = caseInsensitive
    ? resolvedAppPath.toLowerCase()
    : resolvedAppPath;
  const targetForCheck = caseInsensitive
    ? resolvedPath.toLowerCase()
    : resolvedPath;

  const relForCheck = pathImpl.relative(appForCheck, targetForCheck);

  const isWithinRoot =
    relForCheck === "" ||
    (!relForCheck.startsWith(`..${pathImpl.sep}`) &&
      relForCheck !== ".." &&
      !pathImpl.isAbsolute(relForCheck));

  if (!isWithinRoot) {
    throw new Error(
      `Invalid directory path: "${params.directory}" escapes the project directory`,
    );
  }

  return pathImpl.relative(resolvedAppPath, resolvedPath);
}
