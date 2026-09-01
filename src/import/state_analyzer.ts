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
  const srcPath = path.join(appPath, "src");
  const stateSources: StateSource[] = [];
  let analyzedFiles = 0;

  if (!fs.existsSync(srcPath)) {
    return {
      sources: [],
      totalStates: 0,
      analyzedFiles: 0,
    };
  }

  // Analyze files for state usage
  const files = getAllFiles(srcPath);

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
      if (content.includes("useState")) {
        stateSources.push({
          name: `React useState (${path.basename(file)})`,
          type: "REACT_STATE",
          file: path.relative(appPath, file),
          classification: "KEEP_LOCAL",
          description: "Temporary component state",
        });
      }

      if (content.includes("useReducer")) {
        stateSources.push({
          name: `React useReducer (${path.basename(file)})`,
          type: "REACT_STATE",
          file: path.relative(appPath, file),
          classification: "REVIEW",
          description: "Complex state management with reducer pattern",
        });
      }

      if (content.includes("useContext")) {
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
          classification: "MOVE_TO_FELTDB",
          description: "Recoil state management",
        });
      }

      if (content.includes("useAtom") || content.includes("useAtomValue")) {
        stateSources.push({
          name: `Jotai atoms (${path.basename(file)})`,
          type: "JOTAI",
          file: path.relative(appPath, file),
          classification: "MOVE_TO_FELTDB",
          description: "Jotai state management",
        });
      }

      if (content.includes("useSelector") || content.includes("useDispatch")) {
        stateSources.push({
          name: `Redux store (${path.basename(file)})`,
          type: "REDUX",
          file: path.relative(appPath, file),
          classification: "MOVE_TO_FELTDB",
          description: "Redux state management",
        });
      }

      if (content.includes("create(") || content.includes("zustand")) {
        stateSources.push({
          name: `Zustand store (${path.basename(file)})`,
          type: "ZUSTAND",
          file: path.relative(appPath, file),
          classification: "MOVE_TO_FELTDB",
          description: "Zustand state management",
        });
      }

      // Detect localStorage/sessionStorage
      if (content.includes("localStorage")) {
        stateSources.push({
          name: `localStorage (${path.basename(file)})`,
          type: "LOCALSTORAGE",
          file: path.relative(appPath, file),
          classification: "MOVE_TO_FELTDB",
          description: "Client-side persistent storage",
        });
      }

      if (content.includes("sessionStorage")) {
        stateSources.push({
          name: `sessionStorage (${path.basename(file)})`,
          type: "SESSION_STORAGE",
          file: path.relative(appPath, file),
          classification: "KEEP_LOCAL",
          description: "Session-specific temporary storage",
        });
      }

      // Detect IndexedDB
      if (content.includes("indexedDB") || content.includes("IDBDatabase")) {
        stateSources.push({
          name: `IndexedDB (${path.basename(file)})`,
          type: "INDEXED_DB",
          file: path.relative(appPath, file),
          classification: "MOVE_TO_FELTDB",
          description: "Indexed database for client-side storage",
        });
      }

      // Detect API responses
      if (
        content.includes("fetch(") ||
        content.includes("axios") ||
        content.includes("useQuery") ||
        content.includes("useMutation")
      ) {
        stateSources.push({
          name: `API responses (${path.basename(file)})`,
          type: "API_RESPONSE",
          file: path.relative(appPath, file),
          classification: "REPLACE_WITH_FELTDB",
          description: "State populated from API calls",
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
