import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface FeltDBIntegrationProps {
  appId: number;
}

export function FeltDBIntegration({ appId }: FeltDBIntegrationProps) {
  const { data: status, isLoading, error } = useQuery({
    queryKey: ["feltdb-status", appId],
    queryFn: () => ipc.feltdb.getStatus({ appId }),
    refetchInterval: 5000, // Refetch every 5 seconds to get latest status
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">Checking FeltDB status...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const statusColor =
    status.status === "ready"
      ? "text-green-600"
      : status.status === "initializing"
        ? "text-yellow-600"
        : "text-red-600";

  const statusIcon =
    status.status === "ready" ? (
      <CheckCircle2 className={`h-4 w-4 ${statusColor}`} />
    ) : (
      <AlertCircle className={`h-4 w-4 ${statusColor}`} />
    );

  const modeLabel = status.mode === "managed" ? "Managed Account" : "Local";
  const runtimeLabel =
    status.runtime === "server"
      ? "Server (Node)"
      : status.runtime === "browser"
        ? "Browser (WASM)"
        : "Managed";

  return (
    <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {statusIcon}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              FeltDB
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Runtime: {runtimeLabel} • Mode: {modeLabel}
            </p>
            {status.status === "failed" && (
              <p className="text-xs text-red-600 mt-1">
                FeltDB initialization failed. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span
          className={
            status.status === "ready"
              ? "text-green-600 font-medium"
              : status.status === "initializing"
                ? "text-yellow-600 font-medium"
                : "text-red-600 font-medium"
          }
        >
          {status.status === "ready"
            ? "Ready"
            : status.status === "initializing"
              ? "Initializing..."
              : "Failed"}
        </span>
      </div>
    </div>
  );
}
