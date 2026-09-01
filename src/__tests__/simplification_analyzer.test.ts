/**
 * Tests for SimplificationAnalyzer
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { analyzeSimplification } from "../import/simplification_analyzer";
import type {
  ApplicationAnalysis,
  StateAnalysis,
  BackendAnalysis,
  DataAnalysis,
} from "../ipc/types/conversion-analysis";

describe("SimplificationAnalyzer", () => {
  const testProjectPath = path.join(
    process.cwd(),
    ".test-project-simplification",
  );

  beforeAll(() => {
    // Create test project structure
    if (!fs.existsSync(testProjectPath)) {
      fs.mkdirSync(testProjectPath, { recursive: true });
      fs.mkdirSync(path.join(testProjectPath, "src"), { recursive: true });
      fs.mkdirSync(path.join(testProjectPath, "src", "components"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(testProjectPath, "src", "pages"), {
        recursive: true,
      });

      // Create package.json
      fs.writeFileSync(
        path.join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-app",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
            zustand: "^4.0.0",
          },
        }),
      );

      // Create some dummy source files
      fs.writeFileSync(
        path.join(testProjectPath, "src", "components", "UserList.tsx"),
        "export const UserList = () => null;",
      );
      fs.writeFileSync(
        path.join(testProjectPath, "src", "components", "UserForm.tsx"),
        "export const UserForm = () => null;",
      );
      fs.writeFileSync(
        path.join(testProjectPath, "src", "pages", "Dashboard.tsx"),
        "export const Dashboard = () => null;",
      );
    }
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true });
    }
  });

  it("should calculate complexity metrics based on input analysis", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "users",
          file: "src/hooks/useUsers.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
        {
          type: "REACT_STATE",
          name: "formState",
          file: "src/components/UserForm.tsx",
          classification: "MOVE_TO_FELTDB",
        },
        {
          type: "ZUSTAND",
          name: "userStore",
          file: "src/store/userStore.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
        {
          type: "LOCALSTORAGE",
          name: "preferences",
          file: "src/hooks/usePreferences.ts",
          classification: "MOVE_TO_FELTDB",
        },
      ],
      totalStates: 4,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/users", file: "routes/api/users.ts" },
        { method: "POST", path: "/api/users", file: "routes/api/users.ts" },
        {
          method: "GET",
          path: "/api/users/:id",
          file: "routes/api/users/[id].ts",
        },
        {
          method: "PUT",
          path: "/api/users/:id",
          file: "routes/api/users/[id].ts",
        },
        {
          method: "DELETE",
          path: "/api/users/:id",
          file: "routes/api/users/[id].ts",
        },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 4,
      tables: ["users", "posts", "comments", "tags"],
      excludedFields: ["password", "apiKey"],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify complexity metrics
    expect(result.complexity).toBeDefined();
    expect(result.complexity.currentLOC).toBeGreaterThan(0);
    expect(result.complexity.removableLOC).toBeGreaterThan(0);
    expect(result.complexity.estimatedReductionPercent).toBeGreaterThan(0);
    expect(result.complexity.estimatedReductionPercent).toBeLessThanOrEqual(
      100,
    );
  });

  it("should calculate category removals", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "data",
          file: "src/hooks/useData.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
      ],
      totalStates: 1,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/data", file: "routes/api/data.ts" },
        { method: "POST", path: "/api/data", file: "routes/api/data.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 2,
      tables: ["data", "logs"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify category removals exist
    expect(result.categoryRemovals).toBeDefined();
    expect(Array.isArray(result.categoryRemovals)).toBe(true);
    expect(result.categoryRemovals.length).toBeGreaterThan(0);

    // Check specific categories
    const apiRouteRemoval = result.categoryRemovals.find(
      (r) => r.category === "API routes",
    );
    expect(apiRouteRemoval).toBeDefined();
    expect(apiRouteRemoval?.changePercent).toBeLessThan(0);
  });

  it("should identify state plumbing flows", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "users",
          file: "src/hooks/useUsers.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
        {
          type: "API_RESPONSE",
          name: "posts",
          file: "src/hooks/usePosts.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
      ],
      totalStates: 2,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/users", file: "routes/api/users.ts" },
        { method: "GET", path: "/api/posts", file: "routes/api/posts.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 2,
      tables: ["users", "posts"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify state plumbing flows
    expect(result.statePlumbingFlows).toBeDefined();
    expect(Array.isArray(result.statePlumbingFlows)).toBe(true);
    expect(result.statePlumbingFlows.length).toBeGreaterThan(0);

    // Check flow properties
    const flow = result.statePlumbingFlows[0];
    expect(flow.description).toBeDefined();
    expect(Array.isArray(flow.steps)).toBe(true);
    expect(flow.steps.length).toBeGreaterThan(0);
    expect(typeof flow.canBeEliminated).toBe("boolean");
    expect(typeof flow.canBeConsolidated).toBe("boolean");
  });

  it("should calculate flow statistics", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "data",
          file: "src/hooks/useData.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
      ],
      totalStates: 1,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/data", file: "routes/api/data.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 1,
      tables: ["data"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify flow statistics
    expect(result.flowStats).toBeDefined();
    expect(typeof result.flowStats.canBeEliminated).toBe("number");
    expect(typeof result.flowStats.canBeConsolidated).toBe("number");
    expect(typeof result.flowStats.shouldRemain).toBe("number");
    expect(
      result.flowStats.canBeEliminated +
        result.flowStats.canBeConsolidated +
        result.flowStats.shouldRemain,
    ).toBe(result.statePlumbingFlows.length);
  });

  it("should calculate new FeltDB code estimate", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "users",
          file: "src/hooks/useUsers.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
      ],
      totalStates: 1,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/users", file: "routes/api/users.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 1,
      tables: ["users"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify new FeltDB code estimate
    expect(result.newFeltDBCode).toBeGreaterThan(0);
    expect(result.newFeltDBCode).toBeLessThan(3000);
  });

  it("should include new concepts", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [],
      totalStates: 0,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 0,
      tables: [],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify new concepts
    expect(result.newConcepts).toBeDefined();
    expect(Array.isArray(result.newConcepts)).toBe(true);
    expect(result.newConcepts.length).toBeGreaterThan(0);
    expect(result.newConcepts[0]).toContain("FeltDB");
  });

  it("should estimate after LOC range", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "data",
          file: "src/hooks/useData.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
      ],
      totalStates: 1,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/data", file: "routes/api/data.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 1,
      tables: ["data"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify estimated after LOC
    expect(result.estimatedAfterLOC).toBeDefined();
    expect(result.estimatedAfterLOC.low).toBeGreaterThan(0);
    expect(result.estimatedAfterLOC.high).toBeGreaterThan(0);
    expect(result.estimatedAfterLOC.high).toBeGreaterThanOrEqual(
      result.estimatedAfterLOC.low,
    );
    expect(result.estimatedAfterLOC.low).toBeLessThan(
      result.complexity.currentLOC,
    );
  });

  it("should calculate net estimated reduction", async () => {
    const appAnalysis: ApplicationAnalysis = {
      framework: "REACT",
      buildSystem: "VITE",
      packageManager: "NPM",
      sourceFiles: 50,
      entryPoints: ["src/main.tsx"],
    };

    const stateAnalysis: StateAnalysis = {
      sources: [
        {
          type: "API_RESPONSE",
          name: "users",
          file: "src/hooks/useUsers.ts",
          classification: "REPLACE_WITH_FELTDB",
        },
        {
          type: "REACT_STATE",
          name: "formState",
          file: "src/components/UserForm.tsx",
          classification: "MOVE_TO_FELTDB",
        },
      ],
      totalStates: 2,
    };

    const backendAnalysis: BackendAnalysis = {
      apiRoutes: [
        { method: "GET", path: "/api/users", file: "routes/api/users.ts" },
        { method: "POST", path: "/api/users", file: "routes/api/users.ts" },
      ],
      serverActions: [],
      orm: "DRIZZLE",
      databases: ["POSTGRES"],
    };

    const dataAnalysis: DataAnalysis = {
      totalTables: 1,
      tables: ["users"],
      excludedFields: [],
    };

    const result = await analyzeSimplification(
      appAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      testProjectPath,
    );

    // Verify net reduction calculation
    expect(result.netEstimatedReduction).toBeDefined();
    const expectedNet =
      result.complexity.removableLOC +
      result.complexity.replaceableLOC -
      result.newFeltDBCode;
    expect(result.netEstimatedReduction).toBe(expectedNet);
  });
});
