import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverJavaScriptProject,
  getDiscoveredRunCommand,
} from "../import/project_discovery";

const temporaryDirectories: string[] = [];

function temporaryRepository(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "felt-discovery-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("JavaScript project discovery", () => {
  it("finds a nested frontend and uses its declared package manager", () => {
    const repository = temporaryRepository();
    const frontend = path.join(repository, "web");
    fs.mkdirSync(frontend);
    fs.writeFileSync(
      path.join(frontend, "package.json"),
      JSON.stringify({
        packageManager: "pnpm@9.15.0",
        scripts: { dev: "next dev" },
        dependencies: { next: "15.0.0", react: "19.0.0" },
      }),
    );
    fs.writeFileSync(path.join(frontend, "package-lock.json"), "{}");

    const project = discoverJavaScriptProject(repository);
    expect(project?.relativePath).toBe("web");
    expect(project?.packageManager).toBe("pnpm");
    expect(getDiscoveredRunCommand(repository, 5317)).toContain(
      "pnpm run dev --port 5317",
    );
  });

  it("uses an available start script instead of assuming dev exists", () => {
    const repository = temporaryRepository();
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({ scripts: { start: "node server.js" } }),
    );
    fs.writeFileSync(path.join(repository, "package-lock.json"), "{}");

    const command = getDiscoveredRunCommand(repository, 5318);
    expect(command).toContain("npm run start -- --port 5318");
    expect(command).not.toContain("run dev");
  });

  it("does not guess when conflicting package-manager lockfiles exist", () => {
    const repository = temporaryRepository();
    fs.writeFileSync(
      path.join(repository, "package.json"),
      JSON.stringify({ scripts: { dev: "next dev" } }),
    );
    fs.writeFileSync(path.join(repository, "package-lock.json"), "{}");
    fs.writeFileSync(path.join(repository, "pnpm-lock.yaml"), "");

    expect(discoverJavaScriptProject(repository)?.packageManager).toBe(
      "unknown",
    );
  });
});
