import { getProjectStore } from "@/store";
import { createTypedHandler } from "./base";
import { promptContracts } from "../types/prompts";

export function registerPromptHandlers() {
  createTypedHandler(promptContracts.list, async () => {
    return (await getProjectStore().listPrompts()).map((prompt) => ({
      ...prompt,
      description: prompt.description ?? null,
    }));
  });

  createTypedHandler(promptContracts.create, async (_, params) => {
    const { title, content, description } = params;
    if (!title || !content) {
      throw new Error("Title and content are required");
    }
    const prompt = await getProjectStore().createPrompt({
      title,
      description,
      content,
    });
    return { ...prompt, description: prompt.description ?? null };
  });

  createTypedHandler(promptContracts.update, async (_, params) => {
    const { id, title, content, description } = params;
    if (!id) throw new Error("Prompt id is required");
    await getProjectStore().updatePrompt(id, { title, content, description });
  });

  createTypedHandler(promptContracts.delete, async (_, id) => {
    if (!id) throw new Error("Prompt id is required");
    await getProjectStore().deletePrompt(id);
  });
}
