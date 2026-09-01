import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { showError, showSuccess } from "@/lib/toast";

export const feltdbKeys = {
  status: (appId: number) => ["feltdb-status", appId],
  managed: (accountId: string) => ["feltdb-managed", accountId],
};

/**
 * Hook to get the FeltDB connection status for an app
 */
export function useFeltDBStatus(appId: number) {
  return useQuery({
    queryKey: feltdbKeys.status(appId),
    queryFn: () => ipc.feltdb.getStatus({ appId }),
    enabled: !!appId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

/**
 * Hook to initialize FeltDB for an app
 */
export function useInitializeFeltDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      appId: number;
      runtime: "server" | "browser" | "managed";
      mode: "local" | "managed";
    }) => ipc.feltdb.initialize(params),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: feltdbKeys.status(variables.appId),
      });
      showSuccess(
        `FeltDB initialized with ${variables.runtime} runtime (${variables.mode} mode)`,
      );
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to start FeltDB runtime for an app
 */
export function useStartFeltDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: number) => ipc.feltdb.start({ appId }),
    onSuccess: (_, appId) => {
      queryClient.invalidateQueries({ queryKey: feltdbKeys.status(appId) });
      showSuccess("FeltDB runtime started");
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to perform health check on FeltDB runtime
 */
export function useFeltDBHealthCheck() {
  return useMutation({
    mutationFn: (appId: number) =>
      ipc.feltdb.healthCheck({ appId }),
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to connect to managed FeltDB
 */
export function useConnectManagedFeltDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { appId: number; projectId: string; accountId: string }) =>
      ipc.feltdb.setManagedProject(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: feltdbKeys.status(variables.appId),
      });
      showSuccess("Connected to Managed FeltDB");
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to list managed FeltDB projects for an account
 */
export function useListManagedFeltDBProjects(accountId?: string) {
  return useQuery({
    queryKey: feltdbKeys.managed(accountId || ""),
    queryFn: () => ipc.feltdb.listManagedProjects({ accountId: accountId || "" }),
    enabled: !!accountId,
  });
}

/**
 * Hook to authenticate with Managed FeltDB
 */
export function useAuthenticateManagedFeltDB() {
  return useMutation({
    mutationFn: (email?: string) =>
      ipc.feltdb.authenticateManaged({ email }),
    onError: (error) => {
      showError(error as any);
    },
  });
}

/**
 * Hook to disconnect from Managed FeltDB
 */
export function useDisconnectManagedFeltDB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: number) =>
      ipc.feltdb.disconnectManaged({ appId }),
    onSuccess: (_, appId) => {
      queryClient.invalidateQueries({ queryKey: feltdbKeys.status(appId) });
      showSuccess("Disconnected from Managed FeltDB");
    },
    onError: (error) => {
      showError(error as any);
    },
  });
}
