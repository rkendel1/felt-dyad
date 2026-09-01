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

// Selected component/state for display in StateInspector
export const selectedStateAtom = atom<
  | {
      component?: {
        name: string;
        sourcePath: string;
      };
      collection?: {
        name: string;
        recordId?: string;
      };
      record?: {
        id: string;
        fields: Array<{
          name: string;
          type: string;
          value?: string | number | boolean | null;
        }>;
      };
    }
  | undefined
>(undefined);
