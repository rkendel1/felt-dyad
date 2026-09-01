import { type Template, localTemplatesData } from "../../shared/templates";

// Get all templates (local + API)
export async function getAllTemplates(): Promise<Template[]> {
  return localTemplatesData;
}

export async function getTemplateOrThrow(
  templateId: string,
): Promise<Template> {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find((template) => template.id === templateId);
  if (!template) {
    throw new Error(
      `Template ${templateId} not found. Please select a different template.`,
    );
  }
  return template;
}
