import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "../db";
import { apps } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Tests for FeltDB handlers
 * Verifies that FeltDB is properly configured as the default database provider
 */
describe("FeltDB Handlers", () => {
  let testAppId: number;

  beforeEach(async () => {
    // Create a test app
    const [app] = await db
      .insert(apps)
      .values({
        name: "test-feltdb-app",
        path: "/tmp/test-app",
      })
      .returning();
    testAppId = app.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(apps).where(eq(apps.id, testAppId));
  });

  describe("App Creation", () => {
    it("should create app with FeltDB defaults", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });

      expect(app).toBeDefined();
      expect(app?.feltdbRuntime).toBe("server");
      expect(app?.feltdbMode).toBe("local");
      expect(app?.feltdbStatus).toBe("ready");
    });

    it("should have FeltDB as the primary runtime", async () => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });

      expect(app?.feltdbRuntime).toEqual("server");
      expect(app?.neonProjectId).toBeNull();
      expect(app?.supabaseProjectId).toBeNull();
    });
  });

  describe("FeltDB Configuration", () => {
    it("should support updating FeltDB configuration", async () => {
      await db
        .update(apps)
        .set({
          feltdbRuntime: "browser",
          feltdbMode: "local",
        })
        .where(eq(apps.id, testAppId));

      const updated = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });

      expect(updated?.feltdbRuntime).toBe("browser");
      expect(updated?.feltdbMode).toBe("local");
    });

    it("should support managed FeltDB configuration", async () => {
      await db
        .update(apps)
        .set({
          feltdbRuntime: "managed",
          feltdbMode: "managed",
          feltdbProjectId: "project-123",
          feltdbAccountId: "account-456",
        })
        .where(eq(apps.id, testAppId));

      const updated = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });

      expect(updated?.feltdbRuntime).toBe("managed");
      expect(updated?.feltdbMode).toBe("managed");
      expect(updated?.feltdbProjectId).toBe("project-123");
      expect(updated?.feltdbAccountId).toBe("account-456");
    });

    it("should track FeltDB status", async () => {
      await db
        .update(apps)
        .set({ feltdbStatus: "initializing" })
        .where(eq(apps.id, testAppId));

      let updated = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });
      expect(updated?.feltdbStatus).toBe("initializing");

      await db
        .update(apps)
        .set({ feltdbStatus: "ready" })
        .where(eq(apps.id, testAppId));

      updated = await db.query.apps.findFirst({
        where: eq(apps.id, testAppId),
      });
      expect(updated?.feltdbStatus).toBe("ready");
    });
  });

  describe("Backward Compatibility", () => {
    it("should not affect existing Neon or Supabase configurations", async () => {
      const [neonApp] = await db
        .insert(apps)
        .values({
          name: "test-neon-app",
          path: "/tmp/neon-app",
          neonProjectId: "neon-123",
          feltdbRuntime: "server",
          feltdbMode: "local",
        })
        .returning();

      const retrieved = await db.query.apps.findFirst({
        where: eq(apps.id, neonApp.id),
      });

      expect(retrieved?.neonProjectId).toBe("neon-123");
      expect(retrieved?.feltdbRuntime).toBe("server");
      // Both can coexist
      expect(retrieved?.feltdbMode).toBe("local");

      await db.delete(apps).where(eq(apps.id, neonApp.id));
    });
  });
});
