import path from "node:path";
import fs from "node:fs";
import {
  ApplicationAnalysis,
  FrameworkType,
} from "@/ipc/types/conversion-analysis";
import { discoverJavaScriptProject } from "./project_discovery";

export async function analyzeApplication(
  appPath: string,
): Promise<ApplicationAnalysis> {
  const discovered = discoverJavaScriptProject(appPath);
  const analysisPath = discovered?.rootPath ?? appPath;
  const packageJsonPath = path.join(analysisPath, "package.json");

  let packageJson = { devDependencies: {}, dependencies: {} };
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch {
      // Continue with empty package json
    }
  }

  // Detect framework
  const framework = detectFramework(packageJson);

  // Detect package manager
  const packageManager = discovered?.packageManager ?? "unknown";

  // Detect build system
  const buildSystem = detectBuildSystem(packageJson);

  // Detect entry points
  const entryPoints = detectEntryPoints(analysisPath, packageJson);

  // Detect routes
  const routes = detectRoutes(analysisPath, framework);

  // Detect components
  const components = detectComponents(analysisPath, framework);

  return {
    framework,
    packageManager,
    entryPoints,
    routes,
    components,
    buildSystem,
  };
}

function detectFramework(packageJson: any): FrameworkType {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.react) return "REACT";
  if (deps.vue) return "VUE";
  if (deps["@angular/core"]) return "ANGULAR";
  if (deps.svelte) return "SVELTE";
  if (deps.solid) return "SOLID";

  return "UNKNOWN";
}

function detectBuildSystem(
  packageJson: any,
): "vite" | "webpack" | "next" | "other" | "unknown" {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.vite) return "vite";
  if (deps.webpack) return "webpack";
  if (deps.next) return "next";
  if (deps["@vitejs/plugin-react"]) return "vite";
  if (deps["react-scripts"]) return "webpack";

  return "unknown";
}

function detectEntryPoints(appPath: string, packageJson: any): string[] {
  const entryPoints: string[] = [];

  // Common entry point patterns
  const commonEntryPoints = [
    "src/index.ts",
    "src/index.tsx",
    "src/main.ts",
    "src/main.tsx",
    "index.ts",
    "index.tsx",
    "src/app.ts",
    "src/app.tsx",
  ];

  for (const entry of commonEntryPoints) {
    const fullPath = path.join(appPath, entry);
    if (fs.existsSync(fullPath)) {
      entryPoints.push(entry);
    }
  }

  // Check package.json main field
  if (packageJson.main && fs.existsSync(path.join(appPath, packageJson.main))) {
    entryPoints.push(packageJson.main);
  }

  return entryPoints.length > 0 ? entryPoints : ["src/index.ts", "src/main.ts"];
}

function detectRoutes(
  appPath: string,
  _framework: FrameworkType,
): Array<{ path: string; file: string; type: "page" | "api" | "layout" }> {
  const routes: Array<{
    path: string;
    file: string;
    type: "page" | "api" | "layout";
  }> = [];

  // Look for common route patterns
  const srcPath = path.join(appPath, "src");
  const pagesPath = path.join(srcPath, "pages");
  const routesPath = path.join(srcPath, "routes");
  const appPath2 = path.join(srcPath, "app");
  const rootAppPath = path.join(appPath, "app");
  const rootPagesPath = path.join(appPath, "pages");

  const pathsToCheck = [
    pagesPath,
    routesPath,
    appPath2,
    rootAppPath,
    rootPagesPath,
  ];

  for (const checkPath of pathsToCheck) {
    if (fs.existsSync(checkPath)) {
      try {
        const files = fs.readdirSync(checkPath, { recursive: true });
        for (const file of files) {
          if (
            typeof file === "string" &&
            (file.endsWith(".tsx") || file.endsWith(".ts"))
          ) {
            const filePath = path.join(checkPath, file);
            const relativePath = path.relative(appPath, filePath);

            let type: "page" | "api" | "layout" = "page";
            if (checkPath.includes("api")) type = "api";
            if (file.includes("layout")) type = "layout";

            routes.push({
              path: `/${file.replace(/\.(tsx?|jsx?)$/, "")}`,
              file: relativePath,
              type,
            });
          }
        }
      } catch {
        // Continue if error reading directory
      }
    }
  }

  return routes;
}

function detectComponents(
  appPath: string,
  _framework: FrameworkType,
): Array<{ name: string; file: string; usesState: boolean }> {
  const components: Array<{ name: string; file: string; usesState: boolean }> =
    [];
  const componentsPaths = [
    path.join(appPath, "src", "components"),
    path.join(appPath, "components"),
  ].filter((candidate) => fs.existsSync(candidate));

  if (componentsPaths.length === 0) {
    return components;
  }

  try {
    for (const componentsPath of componentsPaths) {
      const files = fs.readdirSync(componentsPath, { recursive: true });
      for (const file of files) {
        if (
          typeof file === "string" &&
          (file.endsWith(".tsx") ||
            file.endsWith(".ts") ||
            file.endsWith(".jsx") ||
            file.endsWith(".js"))
        ) {
          const filePath = path.join(componentsPath, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const relativePath = path.relative(appPath, filePath);
          const name = path.basename(file, path.extname(file));

          // Check if component uses state
          const usesState =
            /useState|useReducer|useContext|useRecoilState|useAtom|useSelector/.test(
              content,
            );

          components.push({
            name,
            file: relativePath,
            usesState,
          });
        }
      }
    }
  } catch {
    // Continue if error reading directory
  }

  return components;
}
