import { atom } from "jotai";

export const isPreviewOpenAtom = atom(true);
export const selectedFileAtom = atom<{
  path: string;
  line?: number | null;
} | null>(null);
export const activeSettingsSectionAtom = atom<string | null>(
  "general-settings",
);

// Active tab in chat panel: "chat" | "state" | "changes" | "proposals"
export const activeChatPanelTabAtom = atom<
  "chat" | "state" | "changes" | "proposals"
>("chat");
