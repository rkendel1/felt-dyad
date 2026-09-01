/**
 * React Hooks for Application Intelligence
 *
 * Provides type-safe React Query hooks for interacting with the
 * application intelligence layer from UI components.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { applicationIntelligenceClient } from "@/ipc/types/application-intelligence-contracts";

/**
 * Index an application (full scan)
 */
export function useIndexApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: number) => {
      return applicationIntelligenceClient.index({ appId, full: true });
    },
    onSuccess: (data: IndexApplicationResponse, appId: number) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.detail({ appId }),
      });
    },
  });
}

/**
 * Get application intelligence
 */
export function useApplicationIntelligence(appId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applicationIntelligence.detail({ appId }),
    queryFn: async () => {
      return applicationIntelligenceClient.get({ appId });
    },
    enabled,
  });
}

/**
 * Get application context for a component
 */
export function useApplicationContext(
  appId: number,
  selectedComponent?: string,
  request?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.applicationIntelligence.context({
      appId,
      selectedComponent,
      request,
    }),
    queryFn: async () => {
      return applicationIntelligenceClient.getContext({
        appId,
        selectedComponent,
        request,
      });
    },
    enabled,
  });
}

/**
 * Store a decision
 */
export function useStoreDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appId: number;
      decision: {
        id: string;
        title: string;
        description: string;
        scope: "application" | "feature" | "component";
        decision: string;
        rationale?: string;
        source: "user" | "project" | "ai_approved";
        status: "active" | "superseded" | "archived";
        createdAt: number;
        appliesTo?: string[];
      };
    }) => {
      return applicationIntelligenceClient.storeDecision(params);
    },
    onSuccess: (data: any, params: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.detail({
          appId: params.appId,
        }),
      });
    },
  });
}

/**
 * Record a change
 */
export function useRecordChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appId: number;
      change: {
        id: string;
        type: "ai" | "user" | "auto";
        request: string;
        description?: string;
        affected: string[];
        files: string[];
        createdAt: number;
        status: "success" | "failed" | "rolled_back";
        result?: string;
        gitSha?: string;
        buildPassed?: boolean;
        testsPassed?: boolean;
      };
    }) => {
      return applicationIntelligenceClient.recordChange(params);
    },
    onSuccess: (data: any, params: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.detail({
          appId: params.appId,
        }),
      });
    },
  });
}

/**
 * Get reconciliation status
 */
export function useReconciliationStatus(appId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applicationIntelligence.reconciliationStatus({ appId }),
    queryFn: async () => {
      return applicationIntelligenceClient.getReconciliationStatus({ appId });
    },
    enabled,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Reindex application (full or incremental)
 */
export function useReindexApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { appId: number; full?: boolean }) => {
      return applicationIntelligenceClient.reindex(params);
    },
    onSuccess: (data: any, params: any) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.detail({
          appId: params.appId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applicationIntelligence.reconciliationStatus({
          appId: params.appId,
        }),
      });
    },
  });
}
