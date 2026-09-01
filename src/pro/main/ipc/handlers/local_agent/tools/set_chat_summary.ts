import { z } from "zod";
import { ToolDefinition, AgentContext } from "./types";
import { getProjectStore } from "@/store";

const setChatSummarySchema = z.object({
  summary: z.string().describe("A short summary/title for the chat"),
});

export const setChatSummaryTool: ToolDefinition<
  z.infer<typeof setChatSummarySchema>
> = {
  name: "set_chat_summary",
  description:
    "Set the title/summary for this chat message. You should always call this message at the end of the turn when you have finished calling all the other tools.",
  inputSchema: setChatSummarySchema,
  defaultConsent: "always",

  getConsentPreview: (args) => args.summary,

  buildXml: (args, _isComplete) => {
    if (args.summary == undefined) return undefined;
    // No XML needed for this tool
    return ``;
  },

  execute: async (args, ctx: AgentContext) => {
    if (args.summary) {
      const store = getProjectStore();
      const chat = await store.getChat(ctx.chatId);
      if (chat && !chat.title)
        await store.updateChat(ctx.chatId, { title: args.summary });
      ctx.chatSummary = args.summary;
    }

    return `Chat summary set to: ${args.summary}`;
  },
};
