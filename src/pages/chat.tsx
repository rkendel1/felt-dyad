import { useState, useRef, useEffect } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/preview_panel/PreviewPanel";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { useChats } from "@/hooks/useChats";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { BuilderSidebar } from "@/components/builder/BuilderSidebar";
import { DataPanel } from "@/components/builder/DataPanel";
import { ChangesPanel } from "@/components/builder/ChangesPanel";
import { PublishPanel } from "@/components/builder/PublishPanel";
import { ComponentSelectionPanel } from "@/components/builder/ComponentSelectionPanel";
import { visualEditingSelectedComponentAtom } from "@/atoms/previewAtoms";

export default function ChatPage() {
  let { id: chatId } = useSearch({ from: "/chat" });
  const navigate = useNavigate();
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isResizing, setIsResizing] = useState(false);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const { chats, loading } = useChats(selectedAppId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSidebarView, setCurrentSidebarView] = useState<
    "pages" | "data" | "changes" | "publish" | "settings" | null
  >(null);
  const selectedComponent = useAtomValue(visualEditingSelectedComponentAtom);

  useEffect(() => {
    if (!chatId && chats.length && !loading) {
      // Not a real navigation, just a redirect, when the user navigates to /chat
      // without a chatId, we redirect to the first chat
      setSelectedAppId(chats[0].appId);
      navigate({ to: "/chat", search: { id: chats[0].id }, replace: true });
    }
  }, [chatId, chats, loading, navigate]);

  useEffect(() => {
    if (isPreviewOpen) {
      ref.current?.expand();
    } else {
      ref.current?.collapse();
    }
  }, [isPreviewOpen]);
  const ref = useRef<ImperativePanelHandle>(null);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Builder Sidebar - PR11 Feature */}
      <BuilderSidebar
        appId={selectedAppId}
        runtimeStatus="running"
        onViewChange={setCurrentSidebarView}
        currentView={currentSidebarView}
        onToggleSidebar={setSidebarOpen}
        isOpen={sidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sidebar Panel Content - Shows when sidebar view is selected */}
        {currentSidebarView && (
          <div className="w-full max-h-96 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
            {currentSidebarView === "data" && (
              <DataPanel
                collections={[
                  {
                    name: "customers",
                    count: 42,
                    fields: [
                      { name: "id", type: "string" },
                      { name: "name", type: "string" },
                      { name: "status", type: "string" },
                    ],
                  },
                ]}
              />
            )}
            {currentSidebarView === "changes" && <ChangesPanel changes={[]} />}
            {currentSidebarView === "publish" && <PublishPanel />}
            {currentSidebarView === "pages" && (
              <div className="p-4">
                <h3 className="font-bold mb-4">Pages</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pages component coming in Phase 3
                </p>
              </div>
            )}
            {currentSidebarView === "settings" && (
              <div className="p-4">
                <h3 className="font-bold mb-4">Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Settings panel coming in Phase 8
                </p>
              </div>
            )}
          </div>
        )}

        {/* Component Selection Panel - Shows when component is selected */}
        {selectedComponent && !currentSidebarView && (
          <div className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
            <ComponentSelectionPanel />
          </div>
        )}

        {/* Original Chat + Preview Layout */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup autoSaveId="persistence" direction="horizontal">
            <Panel id="chat-panel" minSize={30}>
              <div className="h-full w-full">
                <ChatPanel
                  chatId={chatId}
                  isPreviewOpen={isPreviewOpen}
                  onTogglePreview={() => {
                    setIsPreviewOpen(!isPreviewOpen);
                    if (isPreviewOpen) {
                      ref.current?.collapse();
                    } else {
                      ref.current?.expand();
                    }
                  }}
                />
              </div>
            </Panel>

            <>
              <PanelResizeHandle
                onDragging={(e) => setIsResizing(e)}
                className="w-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-col-resize"
              />
              <Panel
                collapsible
                ref={ref}
                id="preview-panel"
                minSize={20}
                className={cn(
                  !isResizing && "transition-all duration-100 ease-in-out",
                )}
              >
                <PreviewPanel />
              </Panel>
            </>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}
