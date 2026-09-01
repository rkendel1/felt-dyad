import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "unknown";

export interface DiscoveredJavaScriptProject {
  rootPath: string;
  relativePath: string;
  packageJson: Record<string, any>;
  packageManager: PackageManager;
  runScript?: string;
}

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "dist",
  "build",
  "node_modules",
  "target",
  ".feltdb",
]);

export function createProjectSourceFingerprint(projectPath: string): string {
  const hash = crypto.createHash("sha256");
  const analyzedExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".vue",
    ".svelte",
    ".json",
    ".prisma",
    ".sql",
  ]);
  const queue = [projectPath];
  const files: string[] = [];
  while (queue.length > 0) {
    const directory = queue.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) {
        queue.push(entryPath);
      } else if (
        entry.isFile() &&
        analyzedExtensions.has(path.extname(entry.name))
      ) {
        files.push(entryPath);
      }
    }
  }
  for (const file of files.sort()) {
    hash.update(path.relative(projectPath, file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex");
}

function readPackageJson(rootPath: string): Record<string, any> | undefined {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(rootPath, "package.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
}

function candidateScore(candidate: {
  depth: number;
  packageJson: Record<string, any>;
}): number {
  const { packageJson, depth } = candidate;
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const scripts = packageJson.scripts ?? {};
  let score = Math.max(0, 20 - depth * 3);
  if (scripts.dev) score += 50;
  else if (scripts.start) score += 35;
  else if (scripts.serve || scripts.preview) score += 20;
  if (
    dependencies.next ||
    dependencies.vite ||
    dependencies.react ||
    dependencies.vue ||
    dependencies.svelte ||
    dependencies["@angular/core"]
  ) {
    score += 30;
  }
  if (packageJson.workspaces) score -= 15;
  return score;
}

function detectPackageManager(
  projectPath: string,
  packageJson: Record<string, any>,
): PackageManager {
  const declared = String(packageJson.packageManager ?? "").split("@")[0];
  if (["npm", "yarn", "pnpm", "bun"].includes(declared)) {
    return declared as PackageManager;
  }
  if (fs.existsSync(path.join(projectPath, "node_modules", ".pnpm")))
    return "pnpm";
  if (
    fs.existsSync(path.join(projectPath, "node_modules", ".package-lock.json"))
  )
    return "npm";
  const lockfileManagers: PackageManager[] = [];
  if (fs.existsSync(path.join(projectPath, "pnpm-lock.yaml")))
    lockfileManagers.push("pnpm");
  if (fs.existsSync(path.join(projectPath, "yarn.lock")))
    lockfileManagers.push("yarn");
  if (
    fs.existsSync(path.join(projectPath, "bun.lock")) ||
    fs.existsSync(path.join(projectPath, "bun.lockb"))
  )
    lockfileManagers.push("bun");
  if (fs.existsSync(path.join(projectPath, "package-lock.json")))
    lockfileManagers.push("npm");
  return lockfileManagers.length === 1 ? lockfileManagers[0] : "unknown";
}

export function discoverJavaScriptProject(
  repositoryPath: string,
): DiscoveredJavaScriptProject | undefined {
  const candidates: Array<{
    rootPath: string;
    depth: number;
    packageJson: Record<string, any>;
  }> = [];
  const queue = [{ rootPath: repositoryPath, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const packageJson = readPackageJson(current.rootPath);
    if (packageJson) candidates.push({ ...current, packageJson });
    if (current.depth >= 3) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current.rootPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name)) continue;
      queue.push({
        rootPath: path.join(current.rootPath, entry.name),
        depth: current.depth + 1,
      });
    }
  }

  const best = candidates.sort(
    (a, b) => candidateScore(b) - candidateScore(a),
  )[0];
  if (!best) return undefined;

  const scripts = best.packageJson.scripts ?? {};
  const runScript = ["dev", "start", "serve", "preview"].find(
    (script) => typeof scripts[script] === "string",
  );
  return {
    rootPath: best.rootPath,
    relativePath: path.relative(repositoryPath, best.rootPath) || ".",
    packageJson: best.packageJson,
    packageManager: detectPackageManager(best.rootPath, best.packageJson),
    runScript,
  };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function getDiscoveredRunCommand(
  repositoryPath: string,
  port: number,
): string | undefined {
  const project = discoverJavaScriptProject(repositoryPath);
  if (!project?.runScript) return undefined;
  const manager =
    project.packageManager === "unknown" ? "npm" : project.packageManager;
  const install = manager === "npm" ? "npm install" : `${manager} install`;
  const separator = manager === "pnpm" || manager === "yarn" ? "" : " --";
  const run = `${manager} run ${project.runScript}${separator} --port ${port}`;
  const commands = `PORT=${port} ${install} && PORT=${port} ${run}`;
  return project.relativePath === "."
    ? commands
    : `(cd ${shellQuote(project.relativePath)} && ${commands})`;
}
