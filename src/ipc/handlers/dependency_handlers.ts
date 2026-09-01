import { getProjectStore } from "../../store";
import { getDyadAppPath } from "../../paths/paths";
import { executeAddDependency } from "../processors/executeAddDependency";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";

const logger = log.scope("dependency_handlers");
const handle = createLoggedHandler(logger);

export function registerDependencyHandlers() {
  handle(
    "chat:add-dep",
    async (
      _event,
      { chatId, packages }: { chatId: number; packages: string[] },
    ): Promise<void> => {
      // Find the message from the database
      const store = getProjectStore();
      const foundMessages = await store.listMessages(chatId);

      // Find the chat first
      const chat = await store.getChat(chatId);

      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      // Get the app using the appId from the chat
      const app = await store.getApp(chat.appId);

      if (!app) {
        throw new Error(`App for chat ${chatId} not found`);
      }

      const message = [...foundMessages]
        .reverse()
        .find((m) =>
          m.content.includes(
            `<dyad-add-dependency packages="${packages.join(" ")}">`,
          ),
        );

      if (!message) {
        throw new Error(
          `Message with packages ${packages.join(", ")} not found`,
        );
      }

      executeAddDependency({
        packages,
        message,
        appPath: getDyadAppPath(app.path),
      });
    },
  );
}
