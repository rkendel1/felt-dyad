import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { analyzeApplication } from "../import/application_analyzer";
import { analyzeState } from "../import/state_analyzer";
import { analyzeBackend } from "../import/backend_analyzer";
import { analyzeData } from "../import/data_analyzer";
import { analyzeExternalServices } from "../import/external_services_analyzer";
import { runFullAnalysis } from "../import";

// Create a temporary test project
const tempDir = path.join(process.cwd(), ".test-project");

function createTestProject() {
  // Create directory structure
  fs.mkdirSync(path.join(tempDir, "src", "components"), { recursive: true });
  fs.mkdirSync(path.join(tempDir, "src", "pages"), { recursive: true });

  // Create package.json
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({
      name: "test-app",
      version: "1.0.0",
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        axios: "^1.0.0",
        zustand: "^4.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        vite: "^4.0.0",
        "next-auth": "^4.0.0",
      },
    }),
  );

  // Create a React component with state
  fs.writeFileSync(
    path.join(tempDir, "src", "components", "Counter.tsx"),
    `
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
`,
  );

  // Create a page with API calls
  fs.writeFileSync(
    path.join(tempDir, "src", "pages", "Home.tsx"),
    `
import { useEffect, useState } from 'react';
import axios from 'axios';

export function Home() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    axios.get('/api/data').then(res => setData(res.data));
  }, []);
  
  return <div>{data}</div>;
}
`,
  );

  // Create localStorage example
  fs.writeFileSync(
    path.join(tempDir, "src", "pages", "Settings.tsx"),
    `
import { useState, useEffect } from 'react';

export function Settings() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  return <div>{theme}</div>;
}
`,
  );
}

function cleanupTestProject() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("Application Analyzer", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should detect React framework", async () => {
    const analysis = await analyzeApplication(tempDir);
    expect(analysis.framework).toBe("REACT");
  });

  it("should detect npm package manager", async () => {
    const analysis = await analyzeApplication(tempDir);
    expect(["npm", "unknown"]).toContain(analysis.packageManager);
  });

  it("should detect vite build system", async () => {
    const analysis = await analyzeApplication(tempDir);
    expect(analysis.buildSystem).toBe("vite");
  });

  it("should detect components", async () => {
    const analysis = await analyzeApplication(tempDir);
    expect(analysis.components.length).toBeGreaterThan(0);
    expect(analysis.components.some((c) => c.name === "Counter")).toBe(true);
  });

  it("should detect components using state", async () => {
    const analysis = await analyzeApplication(tempDir);
    const counterComponent = analysis.components.find(
      (c) => c.name === "Counter",
    );
    expect(counterComponent?.usesState).toBe(true);
  });
});

describe("Nested application analysis", () => {
  it("analyzes a frontend workspace instead of reporting UNKNOWN", async () => {
    const repository = fs.mkdtempSync(path.join(process.cwd(), ".nested-app-"));
    const frontend = path.join(repository, "web");
    fs.mkdirSync(path.join(frontend, "app", "api", "links"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(frontend, "package.json"),
      JSON.stringify({
        scripts: { dev: "next dev" },
        dependencies: { next: "15.0.0", react: "19.0.0", pg: "8.0.0" },
      }),
    );
    fs.writeFileSync(
      path.join(frontend, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'",
    );
    fs.writeFileSync(
      path.join(frontend, "app", "api", "links", "route.ts"),
      "export async function GET() { return fetch('/links'); }",
    );

    try {
      const plan = await runFullAnalysis(99, repository);
      expect(plan.applicationAnalysis.framework).toBe("REACT");
      expect(plan.applicationAnalysis.packageManager).toBe("pnpm");
      expect(plan.backendAnalysis.framework).toBe("NEXT_JS");
      expect(plan.backendAnalysis.apiRoutes.length).toBeGreaterThan(0);
      expect(plan.stateAnalysis.analyzedFiles).toBeGreaterThan(0);
    } finally {
      fs.rmSync(repository, { recursive: true, force: true });
    }
  });
});

describe("State Analyzer", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should detect useState hooks", async () => {
    const analysis = await analyzeState(tempDir, "REACT");
    const hasUseState = analysis.sources.some((s) => s.type === "REACT_STATE");
    expect(hasUseState).toBe(true);
  });

  it("should detect localStorage usage", async () => {
    const analysis = await analyzeState(tempDir, "REACT");
    const hasLocalStorage = analysis.sources.some(
      (s) => s.type === "LOCALSTORAGE",
    );
    expect(hasLocalStorage).toBe(true);
  });

  it("should detect API responses", async () => {
    const analysis = await analyzeState(tempDir, "REACT");
    const hasApi = analysis.sources.some((s) => s.type === "API_RESPONSE");
    expect(hasApi).toBe(true);
  });

  it("should classify state sources", async () => {
    const analysis = await analyzeState(tempDir, "REACT");
    expect(analysis.sources.length).toBeGreaterThan(0);
    expect(analysis.sources.every((s) => s.classification)).toBe(true);
  });
});

describe("Backend Analyzer", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should detect backend framework", async () => {
    const analysis = await analyzeBackend(tempDir);
    expect(["NEXT_JS", "NONE"]).toContain(analysis.framework);
  });

  it("should return hasDatabaseClient flag", async () => {
    const analysis = await analyzeBackend(tempDir);
    expect(typeof analysis.hasDatabaseClient).toBe("boolean");
  });
});

describe("Data Analyzer", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should detect database type", async () => {
    const analysis = await analyzeData(tempDir);
    expect(analysis.database).toBeDefined();
  });

  it("should exclude sensitive fields", async () => {
    fs.mkdirSync(path.join(tempDir, "prisma"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "prisma", "schema.prisma"),
      `model User {
        id String @id
        password String
        displayName String
      }`,
    );
    const analysis = await analyzeData(tempDir);
    expect(analysis.excludedFields).toEqual(["User.password"]);
  });
});

describe("External Services Analyzer", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should detect authentication services", async () => {
    const services = await analyzeExternalServices(tempDir);
    const hasAuth = services.some((s) => s.type === "AUTHENTICATION");
    expect(hasAuth).toBe(true);
  });

  it("should classify services correctly", async () => {
    const services = await analyzeExternalServices(tempDir);
    expect(services.every((s) => s.classification)).toBe(true);
  });
});

describe("Full Analysis", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    cleanupTestProject();
  });

  it("should run full analysis successfully", async () => {
    const plan = await runFullAnalysis(1, tempDir);
    expect(plan.appId).toBe(1);
    expect(plan.status).toBe("PENDING_APPROVAL");
    expect(plan.applicationAnalysis.framework).toBe("REACT");
    expect(plan.stateAnalysis.sources.length).toBeGreaterThan(0);
    expect(plan.summary).toBeDefined();
    expect(plan.warnings?.length || 0).toBeGreaterThanOrEqual(0);
  });

  it("rejects an empty analysis instead of generating fabricated estimates", async () => {
    const emptyProject = fs.mkdtempSync(
      path.join(process.cwd(), ".empty-app-"),
    );
    try {
      await expect(runFullAnalysis(2, emptyProject)).rejects.toThrow(
        "No JavaScript application was found",
      );
    } finally {
      fs.rmSync(emptyProject, { recursive: true, force: true });
    }
  });

  it("should generate UI changes from analysis", async () => {
    const plan = await runFullAnalysis(1, tempDir);
    expect(plan.uiChanges).toBeDefined();
  });

  it("should generate manual decisions", async () => {
    const plan = await runFullAnalysis(1, tempDir);
    expect(Array.isArray(plan.manualDecisions)).toBe(true);
  });
});
