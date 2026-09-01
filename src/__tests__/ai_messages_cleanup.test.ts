import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const storeMocks = vi.hoisted(() => ({
  listAllMessages: vi.fn(),
  updateMessage: vi.fn(),
}));

const logMocks = vi.hoisted(() => {
  return {
    log: vi.fn(),
    warn: vi.fn(),
  };
});

vi.mock("@/store", () => ({
  getProjectStore: () => storeMocks,
}));

vi.mock("electron-log", () => ({
  default: {
    scope: vi.fn(() => logMocks),
  },
}));

import {
  AI_MESSAGES_TTL_DAYS,
  cleanupOldAiMessagesJson,
} from "@/pro/main/ipc/handlers/local_agent/ai_messages_cleanup";

describe("cleanupOldAiMessagesJson", () => {
  beforeEach(() => {
    storeMocks.listAllMessages.mockReset();
    storeMocks.updateMessage.mockReset();
    logMocks.log.mockClear();
    logMocks.warn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should use the expected TTL constant", () => {
    expect(AI_MESSAGES_TTL_DAYS).toBe(30);
  });

  it("should clear aiMessagesJson for messages older than the cutoff date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-31T00:00:00.000Z"));

    storeMocks.listAllMessages.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date("2024-12-01"),
        aiMessagesJson: { messages: [] },
      },
      {
        id: 2,
        createdAt: new Date("2025-01-15"),
        aiMessagesJson: { messages: [] },
      },
    ]);
    storeMocks.updateMessage.mockResolvedValue(undefined);

    await cleanupOldAiMessagesJson();

    expect(storeMocks.updateMessage).toHaveBeenCalledWith(1, {
      aiMessagesJson: undefined,
    });

    expect(logMocks.log).toHaveBeenCalledWith(
      "Cleaned up old ai_messages_json entries",
    );
    expect(logMocks.warn).not.toHaveBeenCalled();
  });

  it("should not throw if the cleanup fails (logs a warning)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-31T00:00:00.000Z"));

    const err = new Error("boom");
    storeMocks.listAllMessages.mockRejectedValueOnce(err);

    await expect(cleanupOldAiMessagesJson()).resolves.toBeUndefined();

    expect(logMocks.warn).toHaveBeenCalledTimes(1);
    expect(logMocks.warn.mock.calls[0][0]).toBe(
      "Failed to cleanup old ai_messages_json:",
    );
    expect(logMocks.warn.mock.calls[0][1]).toBe(err);
  });
});
