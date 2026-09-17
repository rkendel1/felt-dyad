export interface Template {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  githubUrl?: string;
  isOfficial: boolean;
  isExperimental?: boolean;
}

export const DEFAULT_TEMPLATE_ID = "react";
export const DEFAULT_TEMPLATE = {
  id: "react",
  title: "FeltDB React Starter",
  description:
    "React, TypeScript, Tailwind, and a server-hosted FeltDB data layer configured out of the box.",
  imageUrl: "",
  isOfficial: true,
};

export const KANBAN_TEMPLATE_ID = "kanban";
export const KANBAN_TEMPLATE: Template = {
  id: KANBAN_TEMPLATE_ID,
  title: "FeltDB Kanban Dashboard",
  description:
    "A collaborative drag-and-drop project board backed by a local FeltDB Node server.",
  imageUrl:
    "https://raw.githubusercontent.com/brietsparks/kanban-dashboard/master/demo.gif",
  githubUrl: "https://github.com/brietsparks/kanban-dashboard.git",
  isOfficial: true,
};

export const localTemplatesData: Template[] = [
  DEFAULT_TEMPLATE,
  KANBAN_TEMPLATE,
];
