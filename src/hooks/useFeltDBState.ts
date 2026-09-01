import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";

interface FeltDBCollection {
  name: string;
  recordCount: number;
}

interface FeltDBState {
  collections: FeltDBCollection[];
}

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
    queryKey: ["feltdb-state", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) {
        return { collections: [] };
      }

      try {
        // TODO: Implement IPC call to get FeltDB state
        // const state = await ipc.feltdb.getState({ appId: selectedAppId });
        // return state;

        // Temporary mock data for demonstration
        return {
          collections: [
            { name: "customers", recordCount: 2341 },
            { name: "orders", recordCount: 8492 },
            { name: "projects", recordCount: 42 },
            { name: "preferences", recordCount: 18 },
          ],
        };
      } catch (error) {
        console.error("Failed to fetch FeltDB state:", error);
        return { collections: [] };
      }
    },
    enabled: enabled && selectedAppId !== null,
    staleTime: 30000, // 30 seconds
  });
}
