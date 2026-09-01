import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StateSurface, StateInspector } from "@/components/state";
import { ProposalPanel } from "@/components/proposals/ProposalPanel";
import { ChangesPanel } from "@/components/changes/ChangesPanel";
import {
  Database,
  GitBranch,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { useFeltDBState } from "@/hooks/useFeltDBState";
import { useAtom } from "jotai";
import { activeChatPanelTabAtom } from "@/atoms/viewAtoms";

interface ChatPanelTabsProps {
  children?: React.ReactNode;
}

/**
 * ChatPanelTabs Component
 *
 * Provides tabbed interface for chat panel:
 * - Chat: Main chat interface
 * - State: FeltDB state surface and inspector
 * - Changes: Git history and conversion report
 * - Proposals: Active proposals viewer
 *
 * Part of PR8: FeltDB State-First Application Studio
 */
export const ChatPanelTabs: React.FC<ChatPanelTabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useAtom(activeChatPanelTabAtom);
  const { data: feltdbState } = useFeltDBState(activeTab === "state");

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        setActiveTab(value as "chat" | "state" | "changes" | "proposals")
      }
      className="w-full h-full flex flex-col"
    >
      <TabsList className="w-full rounded-none border-b">
        <TabsTrigger value="chat" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="state" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          State
        </TabsTrigger>
        <TabsTrigger value="changes" className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Changes
        </TabsTrigger>
        <TabsTrigger value="proposals" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Proposals
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="chat"
        className="flex-1 overflow-hidden data-[state=active]:flex flex-col"
      >
        {children}
      </TabsContent>

      <TabsContent
        value="state"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <StateSurface
          collections={feltdbState?.collections || []}
          onSelectCollection={() => {}}
        />
        <StateInspector
          selectedState={undefined}
          isVisible={true}
          onToggleVisibility={() => {}}
        />
      </TabsContent>

      <TabsContent value="changes" className="flex-1 overflow-y-auto p-4">
        <ChangesPanel />
      </TabsContent>

      <TabsContent value="proposals" className="flex-1 overflow-y-auto p-4">
        <ProposalPanel />
      </TabsContent>
    </Tabs>
  );
};
