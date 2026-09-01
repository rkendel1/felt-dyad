import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { ipc, type FeltDBState } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

/**
 * useFeltDBState Hook
 *
 * Fetches FeltDB state information for the current application.
 * Returns collections and their record counts for display in StateSurface.
 *
 * Part of PR8: FeltDB State-First Application Studio
 */
export function useFeltDBState(enabled: boolean = true) {
  const selectedAppId = useAtomValue(selectedAppIdAtom);

  return useQuery<FeltDBState>({
    queryKey: queryKeys.feltdb.state({ appId: selectedAppId }),
    queryFn: async () => {
      if (!selectedAppId) {
        return { configured: false, collections: [] };
      }

      return ipc.feltdb.getState({ appId: selectedAppId });
    },
    enabled: enabled && selectedAppId !== null,
    staleTime: 30000, // 30 seconds
  });
}
