import { DEFAULT_TEMPLATE_ID, KANBAN_TEMPLATE_ID } from "@/shared/templates";

const bundledTemplateDirectories: Record<string, string> = {
  [DEFAULT_TEMPLATE_ID]: "scaffold",
  [KANBAN_TEMPLATE_ID]: "scaffold-kanban",
};

export function getBundledTemplateDirectory(templateId: string): string | null {
  return bundledTemplateDirectories[templateId] ?? null;
}
