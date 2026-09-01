import path from "node:path";
import fs from "node:fs";
import {
  StateAnalysis,
  StateSource,
  FrameworkType,
} from "@/ipc/types/conversion-analysis";

export async function analyzeState(
  appPath: string,
  _framework: FrameworkType,
): Promise<StateAnalysis> {
  const stateSources: StateSource[] = [];
  let analyzedFiles = 0;
  const sourcePaths = ["src", "app", "pages", "components", "lib"]
    .map((directory) => path.join(appPath, directory))
    .filter((directory) => fs.existsSync(directory));

  if (sourcePaths.length === 0) {
    return {
      sources: [],
      totalStates: 0,
      analyzedFiles: 0,
    };
  }

  // Analyze files for state usage
  const files = [
    ...new Set(sourcePaths.flatMap((sourcePath) => getAllFiles(sourcePath))),
  ];

  for (const file of files) {
    if (
      !file.endsWith(".ts") &&
      !file.endsWith(".tsx") &&
      !file.endsWith(".js") &&
      !file.endsWith(".jsx")
    ) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, "utf-8");
      analyzedFiles++;

      // Detect React hooks
      if (/\buseState\s*(?:<[^>]*>)?\s*\(/.test(content)) {
        stateSources.push({
          name: `React useState (${path.basename(file)})`,
          type: "REACT_STATE",
          file: path.relative(appPath, file),
          classification: "KEEP_LOCAL",
          description: "Temporary component state",
        });
      }

      if (/\buseReducer\s*\(/.test(content)) {
        stateSources.push({
          name: `React useReducer (${path.basename(file)})`,
          type: "REACT_STATE",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Complex state management with reducer pattern",
        });
      }

      if (/\buseContext\s*\(/.test(content)) {
        stateSources.push({
          name: `React Context (${path.basename(file)})`,
          type: "REACT_CONTEXT",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Context API for state sharing",
        });
      }

      // Detect state management libraries
      if (
        content.includes("useRecoilState") ||
        content.includes("useRecoilValue")
      ) {
        stateSources.push({
          name: `Recoil atoms (${path.basename(file)})`,
          type: "RECOIL",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Recoil state management",
        });
      }

      if (content.includes("useAtom") || content.includes("useAtomValue")) {
        stateSources.push({
          name: `Jotai atoms (${path.basename(file)})`,
          type: "JOTAI",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Jotai state management",
        });
      }

      if (content.includes("useSelector") || content.includes("useDispatch")) {
        stateSources.push({
          name: `Redux store (${path.basename(file)})`,
          type: "REDUX",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Redux state management",
        });
      }

      if (
        /from\s+["']zustand(?:\/[^"']*)?["']/.test(content) ||
        /require\(["']zustand(?:\/[^"']*)?["']\)/.test(content)
      ) {
        stateSources.push({
          name: `Zustand store (${path.basename(file)})`,
          type: "ZUSTAND",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Zustand state management",
        });
      }

      // Detect localStorage/sessionStorage
      if (
        /\blocalStorage\.(?:getItem|setItem|removeItem|clear)\s*\(/.test(
          content,
        )
      ) {
        const isDeviceIdentity =
          /private[_\s-]?key|identity[_\s-]?seed|cryptographic identity/i.test(
            content,
          );
        const isSyncQueue = /sync[_\s-]?queue/i.test(content);
        stateSources.push({
          name: `localStorage (${path.basename(file)})`,
          type: "LOCALSTORAGE",
          file: path.relative(appPath, file),
          classification: isDeviceIdentity
            ? "KEEP_LOCAL"
            : isSyncQueue
              ? "MOVE_TO_FELTDB"
              : "REVIEW",
          description: isDeviceIdentity
            ? "Device-bound identity material must remain local"
            : isSyncQueue
              ? "Durable synchronization queue"
              : "Client-side persistent storage",
        });
      }

      if (
        /\bsessionStorage\.(?:getItem|setItem|removeItem|clear)\s*\(/.test(
          content,
        )
      ) {
        stateSources.push({
          name: `sessionStorage (${path.basename(file)})`,
          type: "SESSION_STORAGE",
          file: path.relative(appPath, file),
          classification: "KEEP_LOCAL",
          description: "Session-specific temporary storage",
        });
      }

      // Detect IndexedDB
      if (/\bindexedDB\.(?:open|deleteDatabase|cmp)\s*\(/.test(content)) {
        const isDeviceIdentity =
          /private[_\s-]?key|identity[_\s-]?seed|cryptographic identity/i.test(
            content,
          );
        stateSources.push({
          name: `IndexedDB (${path.basename(file)})`,
          type: "INDEXED_DB",
          file: path.relative(appPath, file),
          classification: isDeviceIdentity ? "KEEP_LOCAL" : "MOVE_TO_FELTDB",
          description: isDeviceIdentity
            ? "Device-bound private key storage must remain local"
            : "Durable application records stored in the browser",
        });
      }

      // Detect API responses
      if (
        /\bfetch\s*\(/.test(content) ||
        content.includes("axios") ||
        content.includes("useQuery") ||
        content.includes("useMutation")
      ) {
        const usesInternalApi =
          /(?:fetch\s*\(|axios\.(?:get|post|put|patch|delete)\s*\()\s*[`'"]\/api\//.test(
            content,
          );
        stateSources.push({
          name: `API responses (${path.basename(file)})`,
          type: "API_RESPONSE",
          file: path.relative(appPath, file),
          classification: usesInternalApi ? "REPLACE_WITH_FELTDB" : "REVIEW",
          description: usesInternalApi
            ? "State populated from this application's API routes"
            : "State populated from API calls",
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    sources: stateSources,
    totalStates: stateSources.length,
    analyzedFiles,
  };
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      if (typeof entry === "string") {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isFile()) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Continue if error reading directory
  }

  return files;
}
