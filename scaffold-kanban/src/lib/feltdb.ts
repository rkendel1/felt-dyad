import { configureDevelopmentRuntimeBridge, createFeltDB } from "@feltdb/core";

configureDevelopmentRuntimeBridge({
  sessionId: import.meta.env.VITE_FELTDB_DEV_SESSION_ID,
  workspaceId: import.meta.env.VITE_FELTDB_WORKSPACE_ID,
  namespace: import.meta.env.VITE_FELTDB_NAMESPACE,
  runtime: import.meta.env.VITE_FELTDB_RUNTIME,
  authorityUrl: import.meta.env.VITE_FELTDB_AUTHORITY_URL,
  bridgeUrl: import.meta.env.VITE_FELTDB_DEV_BRIDGE_URL,
  applicationUrl: import.meta.env.VITE_FELTDB_APPLICATION_URL,
});

const managedRuntime = Boolean(import.meta.env.VITE_FELTDB_MANAGED_URL);
const applicationServerUrl =
  import.meta.env.VITE_FELTDB_SERVER_URL ||
  `${window.location.origin}/api/feltdb`;

export const db = createFeltDB(
  managedRuntime
    ? {
        namespace:
          import.meta.env.VITE_FELTDB_MANAGED_NAMESPACE || "{{APP_NAMESPACE}}",
        server: {
          url: import.meta.env.VITE_FELTDB_MANAGED_URL,
          applicationId: import.meta.env.VITE_FELTDB_MANAGED_APPLICATION_ID,
          environment:
            import.meta.env.VITE_FELTDB_MANAGED_ENVIRONMENT || "production",
        },
      }
    : {
        namespace: import.meta.env.VITE_FELTDB_NAMESPACE || "{{APP_NAMESPACE}}",
        server: { url: applicationServerUrl },
      },
);
