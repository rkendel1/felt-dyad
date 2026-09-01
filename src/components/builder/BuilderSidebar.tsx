import { useState } from "react";
import {
  FileText,
  Database,
  GitBranch,
  Upload,
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarView = "pages" | "data" | "changes" | "publish" | "settings" | null;

interface BuilderSidebarProps {
  appId?: number;
  runtimeStatus?: "running" | "stopped" | "error";
  onViewChange?: (view: SidebarView) => void;
  currentView?: SidebarView;
  onToggleSidebar?: (open: boolean) => void;
  isOpen?: boolean;
}

export function BuilderSidebar({
  appId,
  runtimeStatus = "running",
  onViewChange,
  currentView = null,
  onToggleSidebar,
  isOpen = true,
}: BuilderSidebarProps) {
  const [runtimeExpanded, setRuntimeExpanded] = useState(false);

  const navItems: Array<{
    id: SidebarView;
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
    },
    { id: "publish", label: "Publish", icon: <Upload className="w-4 h-4" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleNavClick = (item: SidebarView) => {
    if (onViewChange) {
      onViewChange(item);
    }
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => onToggleSidebar?.(!isOpen)}
        className="fixed bottom-4 left-4 z-40 md:hidden p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "h-screen border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col transition-all duration-300 ease-in-out",
          isOpen ? "w-56" : "-ml-56 md:ml-0 md:w-56 hidden md:flex",
        )}
      >
        {/* App Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="font-semibold text-sm truncate">
            {appId ? `App #${appId}` : "FeltDB Builder"}
          </div>
          <button
            onClick={() => setRuntimeExpanded(!runtimeExpanded)}
            className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 w-full"
          >
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
            <span className="flex-1 text-left">
              {runtimeStatus === "running" && "Running"}
              {runtimeStatus === "stopped" && "Stopped"}
              {runtimeStatus === "error" && "Error"}
            </span>
            <ChevronDown
              className={cn(
                "w-3 h-3 flex-shrink-0 transition-transform",
                runtimeExpanded && "rotate-180",
              )}
            />
          </button>

          {/* Runtime Details */}
          {runtimeExpanded && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Server</span>
                <span className="text-green-600 dark:text-green-400">
                  Ready
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">App</span>
                <span className="text-green-600 dark:text-green-400">
                  Running
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Data</span>
                <span className="text-green-600 dark:text-green-400">
                  Available
                </span>
              </div>
              <button className="w-full mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                Restart
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                currentView === item.id
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Developer Mode Toggle */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              disabled
              title="Developer mode will be available in Phase 8"
            />
            <span className="text-gray-600 dark:text-gray-400">
              Developer Mode
            </span>
          </label>
        </div>
      </div>
    </>
  );
}
