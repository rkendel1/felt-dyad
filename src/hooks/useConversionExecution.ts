import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { showError, showSuccess } from "@/lib/toast";

export const conversionExecutionKeys = {
  execution: (appId: number) => ["conversion-execution", appId],
};

/**
 * Hook to approve a conversion plan for execution
 * Transitions plan from PENDING_APPROVAL to APPROVED state
 */
export function useApproveConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: number) =>
      ipc.conversionExecution.approveConversion({ appId }),
    onSuccess: (data, appId) => {
      queryClient.invalidateQueries({
        queryKey: conversionExecutionKeys.execution(appId),
      });
      showSuccess(data.message || "Conversion plan approved");
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to execute an approved conversion plan
 * Triggers the actual conversion process
 */
export function useExecuteConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: number) =>
      ipc.conversionExecution.executeConversion({ appId }),
    onSuccess: (data, appId) => {
      queryClient.invalidateQueries({
        queryKey: conversionExecutionKeys.execution(appId),
      });
      showSuccess(
        data.message ||
          `Conversion started with checkpoint ${data.checkpointId}`,
      );
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to get the current execution status of a conversion
 */
export function useConversionExecutionStatus(appId?: number) {
  return useQuery({
    queryKey: appId
      ? conversionExecutionKeys.execution(appId)
      : ["conversion-execution"],
    queryFn: () => {
      if (!appId) throw new Error("appId is required");
      return ipc.conversionExecution.getConversionExecution({ appId });
    },
    enabled: !!appId,
    refetchInterval: 5000, // Refetch every 5 seconds during execution
  });
}

/**
 * Hook to rollback a conversion to a previous checkpoint
 */
export function useRollbackConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { conversionId: string; checkpointId: string }) =>
      ipc.conversionExecution.rollbackConversion({
        conversionId: params.conversionId,
        checkpointId: params.checkpointId,
      }),
    onSuccess: (data) => {
      showSuccess(
        data.message ||
          `Conversion rolled back to commit ${data.commitSha?.substring(0, 7)}`,
      );
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}
