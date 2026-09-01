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

export const localTemplatesData: Template[] = [DEFAULT_TEMPLATE];
