import { getProjectStore } from "../../store";
import { createTypedHandler } from "./base";
import { securityContracts } from "../types/security";
import type { SecurityFinding } from "../types/security";

export function registerSecurityHandlers() {
  createTypedHandler(
    securityContracts.getLatestSecurityReview,
    async (_, appId) => {
      if (!appId) {
        throw new Error("App ID is required");
      }

      // Query for the most recent message with security findings
      // Use database filtering instead of loading all data into memory
      const store = getProjectStore();
      const chatIds = new Set(
        (await store.listChats(appId)).map((chat) => chat.id),
      );
      const message = (await store.listAllMessages())
        .filter(
          (item) =>
            chatIds.has(item.chatId) &&
            item.role === "assistant" &&
            item.content.includes("<dyad-security-finding"),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      if (!message) {
        throw new Error("No security review found for this app");
      }

      const findings = parseSecurityFindings(message.content);

      if (findings.length === 0) {
        throw new Error("No security review found for this app");
      }

      return {
        findings,
        timestamp: message.createdAt.toISOString(),
        chatId: message.chatId,
      };
    },
  );
}

function parseSecurityFindings(content: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // Regex to match dyad-security-finding tags
  // Using lazy quantifier with proper boundaries to prevent catastrophic backtracking
  const regex =
    /<dyad-security-finding\s+title="([^"]+)"\s+level="(critical|high|medium|low)">([\s\S]*?)<\/dyad-security-finding>/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const [, title, level, description] = match;
    findings.push({
      title: title.trim(),
      level: level as "critical" | "high" | "medium" | "low",
      description: description.trim(),
    });
  }

  return findings;
}
