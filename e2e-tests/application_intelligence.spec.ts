import { test, expect } from "@playwright/test";
import {
  ElectronApp,
  findLatestBuild,
  launch,
} from "electron-playwright-helpers";
import * as path from "node:path";

let electronApp: ElectronApp;

test.beforeAll(async () => {
  const latestBuild = await findLatestBuild();
  electronApp = await launch({
    args: [latestBuild, "."],
    cwd: path.join(__dirname, ".."),
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test("Application Intelligence: Index an application", async () => {
  const page = await electronApp.firstWindow();

  // Wait for app to load
  await page.waitForTimeout(2000);

  // Test indexing through IPC
  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:index",
      { appId: 1, full: true },
    );
  });

  expect(result).toBeDefined();
  expect(result.applicationId).toBeDefined();
  expect(result.entitiesDiscovered).toBeGreaterThanOrEqual(0);
  expect(result.componentsFound).toBeGreaterThanOrEqual(0);
  expect(result.indexedAt).toBeGreaterThan(0);
});

test("Application Intelligence: Get application intelligence", async () => {
  const page = await electronApp.firstWindow();

  // Index first
  await page.evaluate(async () => {
    await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:index",
      { appId: 1, full: true },
    );
  });

  // Then get
  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:get",
      { appId: 1 },
    );
  });

  expect(result).toBeDefined();
  expect(result.application).toBeDefined();
  expect(Array.isArray(result.components)).toBe(true);
  expect(Array.isArray(result.routes)).toBe(true);
  expect(Array.isArray(result.pages)).toBe(true);
  expect(Array.isArray(result.features)).toBe(true);
  expect(Array.isArray(result.stateSources)).toBe(true);
  expect(Array.isArray(result.collections)).toBe(true);
  expect(Array.isArray(result.serverActions)).toBe(true);
  expect(Array.isArray(result.externalServices)).toBe(true);
  expect(Array.isArray(result.dependencies)).toBe(true);
});

test("Application Intelligence: Get application context", async () => {
  const page = await electronApp.firstWindow();

  // Index first
  await page.evaluate(async () => {
    await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:index",
      { appId: 1, full: true },
    );
  });

  // Get context
  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:get-context",
      {
        appId: 1,
        selectedComponent: "component-12345678",
        request: "Make this editable",
      },
    );
  });

  expect(result).toBeDefined();
  expect(result.selected).toBeDefined();
  expect(result.depth0).toBeDefined();
  expect(result.depth1).toBeDefined();
  expect(result.depth2).toBeDefined();
  expect(result.depth3).toBeDefined();
  expect(Array.isArray(result.relevantDecisions)).toBe(true);
});

test("Application Intelligence: Store decision", async () => {
  const page = await electronApp.firstWindow();

  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:store-decision",
      {
        appId: 1,
        decision: {
          id: "decision-1",
          title: "Keep authentication external",
          description: "Keep Auth0 external",
          scope: "application",
          decision: "Do not migrate Auth0 to FeltDB",
          rationale: "Auth0 is a specialized service",
          source: "user",
          status: "active",
          createdAt: Date.now(),
          appliesTo: [],
        },
      },
    );
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.id).toBe("decision-1");
});

test("Application Intelligence: Record change", async () => {
  const page = await electronApp.firstWindow();

  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:record-change",
      {
        appId: 1,
        change: {
          id: "change-1",
          type: "ai",
          request: "Make customer status editable",
          description:
            "Added editable status field to CustomerStatus component",
          affected: ["component-CustomerStatus", "collection-customers"],
          files: ["src/components/CustomerStatus.tsx"],
          createdAt: Date.now(),
          status: "success",
          gitSha: "abc123def456",
          buildPassed: true,
          testsPassed: true,
        },
      },
    );
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.id).toBe("change-1");
});

test("Application Intelligence: Get reconciliation status", async () => {
  const page = await electronApp.firstWindow();

  // Index first
  await page.evaluate(async () => {
    await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:index",
      { appId: 1, full: true },
    );
  });

  // Get status
  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:get-reconciliation-status",
      { appId: 1 },
    );
  });

  expect(result).toBeDefined();
  expect(["synchronized", "out_of_sync", "reconciling"]).toContain(
    result.status,
  );
  expect(result.lastIndexedAt).toBeGreaterThan(0);
  expect(result.filesChanged).toBeGreaterThanOrEqual(0);
});

test("Application Intelligence: Reindex application", async () => {
  const page = await electronApp.firstWindow();

  const result = await page.evaluate(async () => {
    return await (window as any).electron.ipcRenderer.invoke(
      "application-intelligence:reindex",
      { appId: 1, full: false },
    );
  });

  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.applicationId).toBeDefined();
  expect(result.reindexedAt).toBeGreaterThan(0);
});
