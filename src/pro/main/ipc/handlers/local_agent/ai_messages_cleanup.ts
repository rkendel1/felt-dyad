import log from "electron-log";
import { getProjectStore } from "@/store";

const logger = log.scope("ai_messages_cleanup");

export const AI_MESSAGES_TTL_DAYS = 30;

/**
 * Clear ai_messages_json for messages older than TTL.
 * Run on app startup to prevent database bloat.
 */
export async function cleanupOldAiMessagesJson() {
  const cutoffDate = new Date(Date.now() - AI_MESSAGES_TTL_DAYS * 86_400_000);

  try {
    const store = getProjectStore();
    const expired = (await store.listAllMessages()).filter(
      (message) => message.createdAt < cutoffDate && message.aiMessagesJson,
    );
    await Promise.all(
      expired.map((message) =>
        store.updateMessage(message.id, { aiMessagesJson: undefined }),
      ),
    );

    logger.log("Cleaned up old ai_messages_json entries");
  } catch (err) {
    logger.warn("Failed to cleanup old ai_messages_json:", err);
  }
}
