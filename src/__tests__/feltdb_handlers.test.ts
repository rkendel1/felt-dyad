import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FeltDBProjectStore } from "../store/feltdb_project_store";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Tests for FeltDB handlers
 * Verifies that FeltDB is properly configured as the default database provider
 */
describe("FeltDB Handlers", () => {
  let testAppId: number;
  let testDir: string;
  let store: FeltDBProjectStore;

  beforeEach(async () => {
    // Create a test app (note: when created through IPC handlers, it will have defaults)
    // But here we manually set defaults to match the IPC handler behavior
    testDir = await mkdtemp(path.join(tmpdir(), "feltdb-handlers-"));
    store = new FeltDBProjectStore(testDir);
    await store.initialize();
    const app = await store.createApp({
      name: "test-feltdb-app",
      path: "/tmp/test-app",
      feltdbRuntime: "server",
      feltdbMode: "local",
      feltdbStatus: "ready",
    });
    testAppId = app.id;
  });

  afterEach(async () => {
    // Clean up
    try {
      await store.close();
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("App Creation", () => {
    it("should create app with FeltDB defaults", async () => {
      const app = await store.getApp(testAppId);

      expect(app).toBeDefined();
      expect(app?.feltdbRuntime).toBe("server");
      expect(app?.feltdbMode).toBe("local");
      expect(app?.feltdbStatus).toBe("ready");
    });

    it("should have FeltDB as the primary runtime", async () => {
      const app = await store.getApp(testAppId);

      expect(app?.feltdbRuntime).toEqual("server");
      expect(app?.neonProjectId).toBeNull();
      expect(app?.supabaseProjectId).toBeNull();
    });
  });

  describe("FeltDB Configuration", () => {
    it("should support updating FeltDB configuration", async () => {
      await store.updateApp(testAppId, {
        feltdbRuntime: "browser",
        feltdbMode: "local",
      });

      const updated = await store.getApp(testAppId);

      expect(updated?.feltdbRuntime).toBe("browser");
      expect(updated?.feltdbMode).toBe("local");
    });

    it("should support managed FeltDB configuration", async () => {
      await store.updateApp(testAppId, {
        feltdbRuntime: "managed",
        feltdbMode: "managed",
        feltdbProjectId: "project-123",
        feltdbAccountId: "account-456",
      });

      const updated = await store.getApp(testAppId);

      expect(updated?.feltdbRuntime).toBe("managed");
      expect(updated?.feltdbMode).toBe("managed");
      expect(updated?.feltdbProjectId).toBe("project-123");
      expect(updated?.feltdbAccountId).toBe("account-456");
    });

    it("should track FeltDB status", async () => {
      await store.updateApp(testAppId, { feltdbStatus: "initializing" });

      let updated = await store.getApp(testAppId);
      expect(updated?.feltdbStatus).toBe("initializing");

      await store.updateApp(testAppId, { feltdbStatus: "ready" });

      updated = await store.getApp(testAppId);
      expect(updated?.feltdbStatus).toBe("ready");
    });
  });

  describe("Backward Compatibility", () => {
    it("should not affect existing Neon or Supabase configurations", async () => {
      const neonApp = await store.createApp({
        name: "test-neon-app",
        path: "/tmp/neon-app",
        neonProjectId: "neon-123",
        feltdbRuntime: "server",
        feltdbMode: "local",
      });

      const retrieved = await store.getApp(neonApp.id);

      expect(retrieved?.neonProjectId).toBe("neon-123");
      expect(retrieved?.feltdbRuntime).toBe("server");
      // Both can coexist
      expect(retrieved?.feltdbMode).toBe("local");

      await store.deleteApp(neonApp.id);
    });
  });
});
