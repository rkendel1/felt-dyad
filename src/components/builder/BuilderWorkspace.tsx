import { useState, useRef, useEffect } from "react";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { useAtom } from "jotai";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
import { cn } from "@/lib/utils";
import {
  FileText,
  Database,
  GitBranch,
  Upload,
  ChevronDown,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BuilderWorkspaceProps {
  chatPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  selectedAppId?: number;
}

type NavItem = "pages" | "data" | "changes" | "publish" | "settings";

export function BuilderWorkspace({
  chatPanel,
  previewPanel,
  selectedAppId,
}: BuilderWorkspaceProps) {
  const [isPreviewOpen] = useAtom(isPreviewOpenAtom);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNav, setSelectedNav] = useState<NavItem>("pages");
  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const [runtimeStatus] = useState<"running" | "stopped" | "error">(
    "running",
  );
  const [runtimeOpen, setRuntimeOpen] = useState(false);

  useEffect(() => {
    if (isPreviewOpen) {
      previewPanelRef.current?.expand();
    } else {
      previewPanelRef.current?.collapse();
    }
  }, [isPreviewOpen]);

  const navItems: Array<{
    id: NavItem;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    { id: "pages", label: "Pages", icon: <FileText className="w-4 h-4" /> },
    { id: "data", label: "Data", icon: <Database className="w-4 h-4" /> },
    {
      id: "changes",
      label: "Changes",
      icon: <GitBranch className="w-4 h-4" />,
      badge: "2",
    },
    { id: "publish", label: "Publish", icon: <Upload className="w-4 h-4" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Sidebar - App Navigation */}
      <div className="w-56 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
        {/* App Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="font-semibold text-sm truncate">
            App {selectedAppId}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {runtimeStatus === "running" && (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                Running
              </span>
            )}
            {runtimeStatus === "stopped" && (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                Stopped
              </span>
            )}
            {runtimeStatus === "error" && (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                Error
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedNav(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedNav === item.id
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                )}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </div>
                {item.badge && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setSelectedNav("settings")}
          >
            Developer Mode
          </Button>
        </div>
      </div>

      {/* Main Content Area - Preview and Chat */}
      <PanelGroup autoSaveId="builder-workspace" direction="horizontal">
        {/* Preview Panel */}
        <Panel id="preview-panel" minSize={30} defaultSize={60}>
          <div className="h-full w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
            {previewPanel}
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle
          onDragging={(e) => setIsResizing(e)}
          className="w-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-col-resize"
        />

        {/* Chat Panel */}
        <Panel
          id="chat-panel"
          minSize={20}
          defaultSize={40}
          className={cn(
            !isResizing && "transition-all duration-100 ease-in-out",
          )}
        >
          <div className="h-full w-full overflow-hidden border-l border-gray-200 dark:border-gray-800">
            {chatPanel}
          </div>
        </Panel>
      </PanelGroup>

      {/* Context Menu for Runtime Status */}
      <RuntimeStatusPopover
        status={runtimeStatus}
        isOpen={runtimeOpen}
        onOpenChange={setRuntimeOpen}
      />
    </div>
  );
}

interface RuntimeStatusPopoverProps {
  status: "running" | "stopped" | "error";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function RuntimeStatusPopover({
  status,
  isOpen,
  onOpenChange,
}: RuntimeStatusPopoverProps) {
  const statusColors = {
    running: "text-green-600 dark:text-green-400",
    stopped: "text-gray-600 dark:text-gray-400",
    error: "text-red-600 dark:text-red-400",
  };

  const statusBgColors = {
    running: "bg-green-500",
    stopped: "bg-gray-400",
    error: "bg-red-500",
  };

  return (
    <div className="absolute bottom-8 right-8 w-80 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg bg-white dark:bg-gray-950">
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-block w-3 h-3 rounded-full",
              statusBgColors[status],
            )}
          ></span>
          <div className="text-left">
            <div className="font-semibold text-sm">App Status</div>
            <div className={cn("text-xs", statusColors[status])}>
              {status === "running" && "Application is running"}
              {status === "stopped" && "Application is stopped"}
              {status === "error" && "Application error"}
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="text-sm">
            <div className="font-medium mb-2">Runtime Details</div>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>FeltDB Server: ● Connected</div>
              <div>Application: ● {status}</div>
              <div>Data: ● Available</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              Restart
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Logs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
