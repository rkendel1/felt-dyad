import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Change {
  id: string;
  type: "ai" | "user" | "auto";
  description: string;
  status: "success" | "failed" | "rolled_back";
  createdAt: number;
  affected: string[];
  files: string[];
  result?: string;
}

interface ChangesPanelProps {
  changes?: Change[];
  onRollback?: (changeId: string) => Promise<void>;
}

export function ChangesPanel({ changes = [], onRollback }: ChangesPanelProps) {
  const [expandedChangeId, setExpandedChangeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sort changes by date (newest first)
  const sortedChanges = [...changes].sort((a, b) => b.createdAt - a.createdAt);

  const handleRollback = async (changeId: string) => {
    if (!onRollback) return;
    setIsLoading(true);
    try {
      await onRollback(changeId);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeSince = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusBadgeColor = (
    status: "success" | "failed" | "rolled_back",
  ): string => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
      case "rolled_back":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
    }
  };

  const getTypeIcon = (type: "ai" | "user" | "auto"): string => {
    switch (type) {
      case "ai":
        return "🤖";
      case "user":
        return "👤";
      case "auto":
        return "⚙️";
    }
  };

  if (sortedChanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No changes yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          AI-powered changes to your app will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold">Changes</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {sortedChanges.length} change{sortedChanges.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Changes Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {sortedChanges.map((change, index) => (
            <div key={change.id} className="space-y-2">
              {/* Timeline dot and connector */}
              <div className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white dark:bg-gray-950"></div>
                  {index < sortedChanges.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-700 mt-1"></div>
                  )}
                </div>

                {/* Change content */}
                <div className="flex-1 pb-4">
                  <button
                    onClick={() =>
                      setExpandedChangeId(
                        expandedChangeId === change.id ? null : change.id,
                      )
                    }
                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {getTypeIcon(change.type)}
                          </span>
                          <p className="font-medium text-sm truncate">
                            {change.description}
                          </p>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                              getStatusBadgeColor(change.status),
                            )}
                          >
                            {change.status === "success" && "Applied"}
                            {change.status === "failed" && "Failed"}
                            {change.status === "rolled_back" && "Rolled back"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getTimeSince(change.createdAt)}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-gray-400 transition-transform flex-shrink-0",
                          expandedChangeId === change.id && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expandedChangeId === change.id && (
                    <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm space-y-2">
                      {change.result && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Result
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 break-words">
                            {change.result}
                          </p>
                        </div>
                      )}

                      {change.affected.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Affected
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {change.affected.map((item) => (
                              <span
                                key={item}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {change.files.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Files
                          </p>
                          <div className="space-y-1">
                            {change.files.map((file) => (
                              <p
                                key={file}
                                className="text-xs text-gray-600 dark:text-gray-400 font-mono"
                              >
                                {file}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {change.status === "success" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => handleRollback(change.id)}
                            disabled={isLoading}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Undo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
