import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { listFeltDBModules, parseFlowSpec } from "@feltdb/core";
import { localTemplatesData } from "@/shared/templates";

describe("FeltDB Template Verification", () => {
  const scaffoldPath = path.resolve(__dirname, "../../scaffold");

  it("should have @feltdb/core in package.json dependencies", () => {
    const packageJsonPath = path.join(scaffoldPath, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(packageJson.dependencies["@feltdb/core"]).toBe("0.8.0");
    expect(packageJson.scripts["feltdb:sync"]).toBe("feltdb sync");
    expect(packageJson.scripts.dev).toBe("node server.mjs");
    expect(packageJson.scripts.dev).not.toContain("5173");
  });

  it("includes the canonical FeltDB application model", () => {
    const flowPath = path.join(scaffoldPath, "feltdb.flow");
    const configPath = path.join(scaffoldPath, "feltdb.config.json");

    const flow = fs
      .readFileSync(flowPath, "utf-8")
      .replace("{{FLOW_APP_NAME}}", "GeneratedApp");
    expect(parseFlowSpec(flow).app).toBe("GeneratedApp");
    expect(fs.readFileSync(configPath, "utf-8")).toContain('"runtime": "node"');
  });

  it("uses the 0.8 module catalog for supported external services", () => {
    const modules = listFeltDBModules();
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((module) => Boolean(module.version))).toBe(true);

    const flow = parseFlowSpec(`flow_version 1
app ModuleExample {
  module Billing {
    provider ${modules[0].provider}
    version ${modules[0].version}
  }
}`);
    expect(flow.modules).toEqual([
      {
        name: "Billing",
        provider: modules[0].provider,
        version: modules[0].version,
      },
    ]);
  });

  it("configures the Node server runtime without defining schemas in TypeScript", () => {
    const feltdbPath = path.join(scaffoldPath, "src", "lib", "feltdb.ts");
    expect(fs.existsSync(feltdbPath)).toBe(true);
    const content = fs.readFileSync(feltdbPath, "utf-8");
    expect(content).toContain("createFeltDB");
    expect(content).toContain("server: { url: applicationServerUrl }");
    expect(content).not.toContain("export const collections");
    const server = fs.readFileSync(
      path.join(scaffoldPath, "server.mjs"),
      "utf-8",
    );
    expect(server).toContain('path.join(root, ".feltdb", "data")');
    expect(server).toContain('url.pathname.startsWith("/api/feltdb")');
  });

  it("should have FeltDB rules in AI_RULES.md", () => {
    const aiRulesPath = path.join(scaffoldPath, "AI_RULES.md");
    const content = fs.readFileSync(aiRulesPath, "utf-8");
    expect(content).toContain("FeltDB");
    expect(content).toContain("database");
    expect(content).toContain("persistence");
  });

  it("keeps runtime state out of the committed scaffold", () => {
    expect(fs.existsSync(path.join(scaffoldPath, ".feltdb"))).toBe(false);
    expect(
      fs.readFileSync(path.join(scaffoldPath, ".gitignore"), "utf-8"),
    ).toContain(".feltdb/");
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
it("only advertises FeltDB-backed templates in the Hub", () => {
  expect(localTemplatesData).not.toHaveLength(0);
  for (const template of localTemplatesData) {
    expect(template.title).toContain("FeltDB");
    expect(template.description).toContain("FeltDB");
    expect(template.githubUrl).toBeUndefined();
  }
});
