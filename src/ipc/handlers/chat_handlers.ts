import type { ChatSummary } from "../../lib/schemas";
import { getProjectStore } from "../../store";

import log from "electron-log";
import { getDyadAppPath } from "../../paths/paths";
import { getCurrentCommitHash } from "../utils/git_utils";
import { createTypedHandler } from "./base";
import { chatContracts } from "../types/chat";

const logger = log.scope("chat_handlers");

export function registerChatHandlers() {
  createTypedHandler(chatContracts.createChat, async (_, appId) => {
    // Get the app's path first
    const app = await getProjectStore().getApp(appId);

    if (!app) {
      throw new Error("App not found");
    }

    let initialCommitHash = null;
    try {
      // Get the current git revision of main branch
      initialCommitHash = await getCurrentCommitHash({
        path: getDyadAppPath(app.path),
        ref: "main",
      });
    } catch (error) {
      logger.error("Error getting git revision:", error);
      // Continue without the git revision
    }

    // Create a new chat
    const chat = await getProjectStore().createChat({
      appId,
      initialCommitHash: initialCommitHash ?? undefined,
    });
    logger.info(
      "Created chat:",
      chat.id,
      "for app:",
      appId,
      "with initial commit hash:",
      initialCommitHash,
    );
    return chat.id;
  });

  createTypedHandler(chatContracts.getChat, async (_, chatId) => {
    const store = getProjectStore();
    const chat = await store.getChat(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    return {
      ...chat,
      title: chat.title ?? "",
      messages: (await store.listMessages(chatId)).map((m) => ({
        ...m,
        role: m.role as "user" | "assistant",
      })),
    };
  });

  createTypedHandler(chatContracts.getChats, async (_, appId) => {
    const chats = appId
      ? await getProjectStore().listChats(appId)
      : await getProjectStore().listAllChats();
    return chats.sort(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    ) as ChatSummary[];
  });

  createTypedHandler(chatContracts.deleteChat, async (_, chatId) => {
    await getProjectStore().deleteChat(chatId);
  });

  createTypedHandler(chatContracts.updateChat, async (_, params) => {
    const { chatId, title } = params;
    await getProjectStore().updateChat(chatId, { title });
  });

  createTypedHandler(chatContracts.deleteMessages, async (_, chatId) => {
    await getProjectStore().deleteMessagesByChat(chatId);
  });

  createTypedHandler(chatContracts.searchChats, async (_, params) => {
    const { appId, query } = params;
    return (await getProjectStore().searchChats(appId, query))
      .slice(0, 10)
      .map((result) => ({
        ...result,
        title: result.title ?? null,
      }));
  });

  logger.debug("Registered chat IPC handlers");
}
