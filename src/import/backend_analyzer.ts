import path from "node:path";
import fs from "node:fs";
import {
  BackendAnalysis,
  BackendFramework,
  ApiRoute,
} from "@/ipc/types/conversion-analysis";

export async function analyzeBackend(
  appPath: string,
): Promise<BackendAnalysis> {
  const packageJsonPath = path.join(appPath, "package.json");

  let packageJson = { devDependencies: {}, dependencies: {} };
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    } catch {
      // Continue with empty package json
    }
  }

  const framework = detectBackendFramework(packageJson);
  const apiRoutes = detectApiRoutes(appPath, framework);
  const serverActions = detectServerActions(appPath);
  const databaseORM = detectDatabaseORM(packageJson);
  const hasDatabaseClient = detectDatabaseClient(appPath, packageJson);

  return {
    framework,
    apiRoutes,
    serverActions,
    databaseORM,
    hasDatabaseClient,
  };
}

function detectBackendFramework(packageJson: any): BackendFramework {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.next) return "NEXT_JS";
  if (deps.express) return "EXPRESS";
  if (deps.fastify) return "FASTIFY";
  if (deps["@nestjs/core"]) return "NEST_JS";
  if (deps.django) return "DJANGO";
  if (deps.flask) return "FLASK";
  if (deps.rails) return "RAILS";

  return "NONE";
}

function detectApiRoutes(
  appPath: string,
  framework: BackendFramework,
): ApiRoute[] {
  const routes: ApiRoute[] = [];

  if (framework === "NEXT_JS") {
    routes.push(...detectNextJsRoutes(appPath));
  } else if (framework === "EXPRESS" || framework === "FASTIFY") {
    routes.push(...detectExpressRoutes(appPath));
  }

  return routes;
}

function detectNextJsRoutes(appPath: string): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const appDirs = [path.join(appPath, "src", "app"), path.join(appPath, "app")];
  const pagesDirs = [
    path.join(appPath, "src", "pages"),
    path.join(appPath, "pages"),
  ];

  // Check app directory (Next.js 13+)
  for (const appDir of appDirs.filter((directory) =>
    fs.existsSync(directory),
  )) {
    const files = getAllFiles(appDir);
    for (const file of files) {
      if (
        file.includes("route.") &&
        (file.endsWith(".ts") || file.endsWith(".tsx"))
      ) {
        const relativePath = path.relative(appDir, file);
        const routePath = `/${relativePath.replace(/\/route\.(ts|tsx)$/, "")}`;
        const content = fs.readFileSync(file, "utf-8");

        const methods = detectHttpMethods(content);
        for (const method of methods) {
          routes.push({
            path: routePath,
            method: method as any,
            file: path.relative(appPath, file),
            classification: "REVIEW",
            requiresAuth:
              content.includes("getSession") || content.includes("auth"),
          });
        }
      }
    }
  }

  // Check pages directory (Next.js 12 and below)
  for (const pagesDir of pagesDirs.filter((directory) =>
    fs.existsSync(directory),
  )) {
    const files = getAllFiles(pagesDir);
    for (const file of files) {
      if (
        file.startsWith(path.join(pagesDir, "api")) &&
        (file.endsWith(".ts") || file.endsWith(".tsx"))
      ) {
        const relativePath = path.relative(path.join(pagesDir, "api"), file);
        const routePath = `/${relativePath.replace(/\.(ts|tsx)$/, "")}`;
        const content = fs.readFileSync(file, "utf-8");

        const methods = detectHttpMethods(content);
        for (const method of methods) {
          routes.push({
            path: routePath,
            method: method as any,
            file: path.relative(appPath, file),
            classification: "REVIEW",
            requiresAuth:
              content.includes("getSession") || content.includes("auth"),
          });
        }
      }
    }
  }

  return routes;
}

function detectExpressRoutes(appPath: string): ApiRoute[] {
  const routes: ApiRoute[] = [];

  // Look for main server files
  const possiblePaths = [
    path.join(appPath, "server.ts"),
    path.join(appPath, "server.js"),
    path.join(appPath, "src", "server.ts"),
    path.join(appPath, "src", "server.js"),
    path.join(appPath, "src", "index.ts"),
    path.join(appPath, "src", "index.js"),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");

        // Look for common Express patterns
        const patterns = [
          /app\.(get|post|put|delete|patch)\(['"](\/[^'"]*)['"]/g,
          /router\.(get|post|put|delete|patch)\(['"](\/[^'"]*)['"]/g,
        ];

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const routePath = match[2];

            routes.push({
              path: routePath,
              method: method as any,
              file: path.relative(appPath, filePath),
              classification: "REVIEW",
              requiresAuth:
                content.includes("authenticate") ||
                content.includes("requireAuth"),
            });
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return routes;
}

function detectServerActions(
  appPath: string,
): Array<{ name: string; file: string; description?: string }> {
  const actions: Array<{ name: string; file: string; description?: string }> =
    [];

  // Look for Next.js server actions
  const srcPath = path.join(appPath, "src");
  if (!fs.existsSync(srcPath)) return actions;

  try {
    const files = getAllFiles(srcPath);
    for (const file of files) {
      if (
        (file.endsWith(".ts") || file.endsWith(".tsx")) &&
        fs.existsSync(file)
      ) {
        const content = fs.readFileSync(file, "utf-8");

        if (content.includes('"use server"')) {
          // Extract server action names
          const matches = content.match(
            /export\s+(?:async\s+)?function\s+(\w+)/g,
          );
          if (matches) {
            for (const match of matches) {
              const name = match.replace(
                /export\s+(?:async\s+)?function\s+/,
                "",
              );
              actions.push({
                name,
                file: path.relative(appPath, file),
              });
            }
          }
        }
      }
    }
  } catch {
    // Continue if error reading
  }

  return actions;
}

function detectDatabaseORM(packageJson: any): string | undefined {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.prisma) return "Prisma";
  if (deps.typeorm) return "TypeORM";
  if (deps.sequelize) return "Sequelize";
  if (deps.drizzle) return "Drizzle";
  if (deps.mongoose) return "Mongoose";
  if (deps["@mikro-orm/core"]) return "MikroORM";

  return undefined;
}

function detectDatabaseClient(appPath: string, packageJson: any): boolean {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Check for database clients
  const dbClients = [
    "pg",
    "mysql",
    "mongodb",
    "sqlite3",
    "better-sqlite3",
    "firebase",
    "@firebase/firestore",
    "dynamodb",
    "@aws-sdk/client-dynamodb",
  ];

  return dbClients.some((client) => deps[client]);
}

function detectHttpMethods(content: string): string[] {
  const methods: Set<string> = new Set();
  for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH"] as const) {
    const exportedHandler = new RegExp(
      `export\\s+(?:(?:async\\s+)?function\\s+${method}\\s*\\(|const\\s+${method}\\s*=)`,
      "i",
    );
    if (exportedHandler.test(content)) methods.add(method);
  }

  return Array.from(methods);
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
