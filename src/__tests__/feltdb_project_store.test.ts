import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FeltDBProjectStore } from "../store/feltdb_project_store";
import { CreateAppInput, CreateChatInput, CreateMessageInput } from "../store";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Tests for FeltDBProjectStore
 * Verifies that FeltDB is the persistence layer for Builder state
 */
describe("FeltDBProjectStore", () => {
  let tempDir: string;
  let store: FeltDBProjectStore;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `feltdb-test-${Date.now()}-${Math.random()}`,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    store = new FeltDBProjectStore(tempDir);
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("App Operations", () => {
    it("should create and retrieve an app", async () => {
      const input: CreateAppInput = {
        name: "Test App",
        path: "/tmp/test-app",
      };

      const created = await store.createApp(input);
      expect(created.name).toBe("Test App");
      expect(created.path).toBe("/tmp/test-app");
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      const retrieved = await store.getApp(created.id);
      expect(retrieved?.name).toBe("Test App");
      expect(retrieved?.path).toBe("/tmp/test-app");
    });

    it("should update an app", async () => {
      const created = await store.createApp({
        name: "Original",
        path: "/tmp/app",
      });

      const updated = await store.updateApp(created.id, {
        name: "Updated",
        githubOrg: "myorg",
      });

      expect(updated.name).toBe("Updated");
      expect(updated.githubOrg).toBe("myorg");
    });

    it("should list apps", async () => {
      await store.createApp({ name: "App 1", path: "/tmp/app1" });
      await store.createApp({ name: "App 2", path: "/tmp/app2" });

      const apps = await store.listApps();
      expect(apps.length).toBeGreaterThanOrEqual(2);
    });

    it("should find app by path", async () => {
      await store.createApp({ name: "App", path: "/tmp/unique-path" });

      const found = await store.getAppByPath("/tmp/unique-path");
      expect(found?.name).toBe("App");
    });

    it("should delete an app", async () => {
      const created = await store.createApp({
        name: "To Delete",
        path: "/tmp/delete",
      });

      await store.deleteApp(created.id);
      const retrieved = await store.getApp(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Chat and Message Operations", () => {
    let appId: number;

    beforeEach(async () => {
      const app = await store.createApp({ name: "Test", path: "/tmp/test" });
      appId = app.id;
    });

    it("should create and retrieve chats", async () => {
      const chat = await store.createChat({ appId, title: "Test Chat" });

      expect(chat.appId).toBe(appId);
      expect(chat.title).toBe("Test Chat");

      const retrieved = await store.getChat(chat.id);
      expect(retrieved?.title).toBe("Test Chat");
    });

    it("should create and retrieve messages", async () => {
      const chat = await store.createChat({ appId });

      const msg = await store.createMessage({
        chatId: chat.id,
        role: "user",
        content: "Hello",
      });

      expect(msg.content).toBe("Hello");
      expect(msg.role).toBe("user");

      const retrieved = await store.getMessage(msg.id);
      expect(retrieved?.content).toBe("Hello");
    });

    it("should list messages in order", async () => {
      const chat = await store.createChat({ appId });

      const msg1 = await store.createMessage({
        chatId: chat.id,
        role: "user",
        content: "First",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const msg2 = await store.createMessage({
        chatId: chat.id,
        role: "assistant",
        content: "Second",
      });

      const messages = await store.listMessages(chat.id);
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("First");
      expect(messages[1].content).toBe("Second");
    });

    it("should delete messages by chat", async () => {
      const chat = await store.createChat({ appId });

      await store.createMessage({
        chatId: chat.id,
        role: "user",
        content: "Msg 1",
      });
      await store.createMessage({
        chatId: chat.id,
        role: "assistant",
        content: "Msg 2",
      });

      let messages = await store.listMessages(chat.id);
      expect(messages.length).toBe(2);

      await store.deleteMessagesByChat(chat.id);

      messages = await store.listMessages(chat.id);
      expect(messages.length).toBe(0);
    });
  });

  describe("Project State (key-value)", () => {
    const projectId = 1;

    it("should set and get project state", async () => {
      await store.setProjectState(projectId, "theme", "dark");
      const value = await store.getProjectState(projectId, "theme");
      expect(value).toBe("dark");
    });

    it("should update project state", async () => {
      await store.setProjectState(projectId, "setting", { value: 1 });
      await store.setProjectState(projectId, "setting", { value: 2 });

      const value = await store.getProjectState(projectId, "setting");
      expect(value).toEqual({ value: 2 });
    });

    it("should retrieve project state metadata", async () => {
      await store.setProjectState(projectId, "config", { enabled: true });

      const state = await store.getProjectStateByKey(projectId, "config");
      expect(state?.value).toEqual({ enabled: true });
      expect(state?.updatedAt).toBeDefined();
    });
  });

  describe("Durability: Process Restart", () => {
    it("should recover app data after process restart", async () => {
      const appInput: CreateAppInput = {
        name: "Durable App",
        path: "/tmp/durable",
        githubOrg: "test-org",
      };

      const createdApp = await store.createApp(appInput);
      const chat = await store.createChat({
        appId: createdApp.id,
        title: "Chat",
      });

      await store.createMessage({
        chatId: chat.id,
        role: "user",
        content: "Test message",
      });

      await store.setProjectState(createdApp.id, "lastChat", chat.id);

      // Close and reopen
      await store.close();

      const newStore = new FeltDBProjectStore(tempDir);
      await newStore.initialize();

      // Verify data recovery
      const recoveredApp = await newStore.getApp(createdApp.id);
      expect(recoveredApp?.name).toBe("Durable App");
      expect(recoveredApp?.githubOrg).toBe("test-org");

      const recoveredChat = await newStore.getChat(chat.id);
      expect(recoveredChat?.title).toBe("Chat");

      const messages = await newStore.listMessages(chat.id);
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Test message");

      const lastChat = await newStore.getProjectState(
        createdApp.id,
        "lastChat",
      );
      expect(lastChat).toBe(chat.id);

      await newStore.close();
    });
  });

  describe("Concurrency: Multiple Operations", () => {
    it("should handle concurrent writes without loss", async () => {
      const app = await store.createApp({
        name: "Concurrent",
        path: "/tmp/concurrent",
      });
      const chat = await store.createChat({ appId: app.id });

      // Create multiple messages concurrently
      const msgPromises = Array.from({ length: 3 }).map((_, i) =>
        store.createMessage({
          chatId: chat.id,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
        }),
      );

      // Set project state concurrently
      const statePromises = Array.from({ length: 3 }).map((_, i) =>
        store.setProjectState(app.id, `key_${i}`, { value: i }),
      );

      await Promise.all([...msgPromises, ...statePromises]);

      const messages = await store.listMessages(chat.id);
      expect(messages.length).toBe(3);

      for (let i = 0; i < 3; i++) {
        const state = await store.getProjectState(app.id, `key_${i}`);
        expect(state).toEqual({ value: i });
      }
    });
  });

  describe("FeltDB directory structure", () => {
    it("should create .feltdb directory", async () => {
      const feltdbDir = path.join(tempDir, ".feltdb");
      expect(fs.existsSync(feltdbDir)).toBe(true);
    });
  });
});
