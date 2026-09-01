import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("FeltDB Template Verification", () => {
  const scaffoldPath = path.resolve(__dirname, "../scaffold");

  it("should have @feltdb/core in package.json dependencies", () => {
    const packageJsonPath = path.join(scaffoldPath, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson.dependencies["@feltdb/core"]).toBeDefined();
  });

  it("should have src/lib/feltdb.ts file", () => {
    const feltdbPath = path.join(scaffoldPath, "src", "lib", "feltdb.ts");
    expect(fs.existsSync(feltdbPath)).toBe(true);
    const content = fs.readFileSync(feltdbPath, "utf-8");
    expect(content).toContain("getFeltDB");
    expect(content).toContain("initializeFeltDB");
  });

  it("should have .feltdb/metadata.json template", () => {
    const metadataPath = path.join(scaffoldPath, ".feltdb", "metadata.json");
    expect(fs.existsSync(metadataPath)).toBe(true);
  });

  it("should have .feltdb/.gitignore", () => {
    const gitignorePath = path.join(scaffoldPath, ".feltdb", ".gitignore");
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  it("should have FeltDB rules in AI_RULES.md", () => {
    const aiRulesPath = path.join(scaffoldPath, "AI_RULES.md");
    const content = fs.readFileSync(aiRulesPath, "utf-8");
    expect(content).toContain("FeltDB");
    expect(content).toContain("database");
    expect(content).toContain("persistence");
  });

  it("should initialize FeltDB in App.tsx", () => {
    const appPath = path.join(scaffoldPath, "src", "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("initializeFeltDB");
    expect(content).toContain("useEffect");
  });

  it("should not include SQLite, Supabase, Firebase, or Prisma in template", () => {
    const packageJsonPath = path.join(scaffoldPath, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const forbiddenDeps = [
      "sqlite",
      "better-sqlite3",
      "supabase",
      "firebase",
      "prisma",
      "drizzle-orm",
      "neon",
    ];

    for (const dep of forbiddenDeps) {
      expect(allDeps[dep]).toBeUndefined();
    }
  });
});
