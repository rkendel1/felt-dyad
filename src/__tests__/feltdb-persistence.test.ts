import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getConversionPlanStore } from "../store/conversion_plan_store";
import { runFullAnalysis } from "../import";

// Create a temporary test project
const tempDir = path.join(process.cwd(), ".test-project-feltdb");

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
      },
      devDependencies: {
        typescript: "^5.0.0",
        vite: "^4.0.0",
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
  return <button>{count}</button>;
}
`,
  );

  // Create a page
  fs.writeFileSync(
    path.join(tempDir, "src", "pages", "index.tsx"),
    `import { Counter } from '../components/Counter';
export default function Home() {
  return <Counter />;
}`,
  );
}

describe("FeltDB Persistence", () => {
  beforeAll(() => {
    createTestProject();
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it("should save and retrieve conversion plan from FeltDB", async () => {
    // Run analysis
    const plan = await runFullAnalysis(1, tempDir);
    
    // Save to FeltDB
    const store = await getConversionPlanStore(tempDir);
    const planId = await store.savePlan(1, plan);
    
    expect(planId).toBeDefined();
    expect(typeof planId).toBe("string");
  });

  it("should retrieve saved conversion plan from FeltDB", async () => {
    // Run analysis
    const plan = await runFullAnalysis(1, tempDir);
    
    // Save to FeltDB
    const store = await getConversionPlanStore(tempDir);
    await store.savePlan(1, plan);
    
    // Retrieve from FeltDB
    const retrieved = await store.getPlan(1);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.appId).toBe(1);
    expect(retrieved?.status).toBe("PENDING_APPROVAL");
    expect(retrieved?.applicationAnalysis.framework).toBe("REACT");
  });

  it("should list all conversion plans from FeltDB", async () => {
    // Run analysis
    const plan = await runFullAnalysis(1, tempDir);
    
    // Save to FeltDB
    const store = await getConversionPlanStore(tempDir);
    await store.savePlan(1, plan);
    
    // List all plans
    const plans = await store.listPlans();
    
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
  });

  it("should delete conversion plan from FeltDB", async () => {
    // Run analysis
    const plan = await runFullAnalysis(1, tempDir);
    
    // Save to FeltDB
    const store = await getConversionPlanStore(tempDir);
    await store.savePlan(1, plan);
    
    // Delete plan
    const deleted = await store.deletePlan(1);
    expect(deleted).toBe(true);
    
    // Verify it's gone
    const retrieved = await store.getPlan(1);
    expect(retrieved).toBeNull();
  });
});
