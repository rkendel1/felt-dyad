import log from "electron-log";
import { getProjectStore } from "../../store";
import { createTypedHandler } from "./base";
import { createTestOnlyLoggedHandler } from "./safe_handle";
import { feltdbContracts } from "../types/feltdb";
import {
  getFeltDBCredentials,
  getStoredFeltDBAccount,
  listFeltDBProjects,
  storeFeltDBCredentials,
} from "./feltdb_oauth";

const logger = log.scope("feltdb_handlers");
const testOnlyHandle = createTestOnlyLoggedHandler(logger);

export function registerFeltdbHandlers() {
  // Initialize FeltDB for an app
  createTypedHandler(feltdbContracts.initialize, async (_, params) => {
    const { appId, runtime, mode } = params;

    logger.info(
      `Initializing FeltDB for app ${appId}: runtime=${runtime}, mode=${mode}`,
    );

    // Update app with FeltDB configuration
    await getProjectStore().updateApp(appId, {
      feltdbRuntime: runtime,
      feltdbMode: mode,
      feltdbStatus: "ready",
    });

    logger.info(`FeltDB initialized for app ${appId}`);

    return {
      runtime,
      mode,
      status: "ready" as const,
    };
  });

  // Get current FeltDB connection status
  createTypedHandler(feltdbContracts.getStatus, async (_, params) => {
    const { appId } = params;

    const appData = await getProjectStore().getApp(appId);
    if (!appData) {
      logger.warn(`App with ID ${appId} not found`);
      return undefined;
    }

    if (!appData.feltdbRuntime || !appData.feltdbMode) {
      return undefined;
    }

    logger.info(`Retrieved FeltDB status for app ${appId}`);

    return {
      runtime: appData.feltdbRuntime as "server" | "browser" | "managed",
      mode: appData.feltdbMode as "local" | "managed",
      status:
        (appData.feltdbStatus as "ready" | "initializing" | "failed") ||
        undefined,
      projectId: appData.feltdbProjectId || undefined,
      accountId: appData.feltdbAccountId || undefined,
    };
  });

  // Browser FeltDB is embedded in the generated app. Server FeltDB is hosted by
  // the app's own dev process, so there is no second process to launch here.
  createTypedHandler(feltdbContracts.start, async (_, params) => {
    const { appId } = params;

    logger.info(`Starting FeltDB runtime for app ${appId}`);

    try {
      const app = await getProjectStore().getApp(appId);
      if (!app) throw new Error(`App ${appId} not found`);
      await getProjectStore().updateApp(appId, { feltdbStatus: "ready" });
      logger.info(`FeltDB runtime is provided by app ${appId}`);

      return;
    } catch (error) {
      logger.error(`Failed to start FeltDB for app ${appId}:`, error);
      await getProjectStore().updateApp(appId, { feltdbStatus: "failed" });
      throw new Error(`Failed to start FeltDB: ${error}`);
    }
  });

  // Kept for IPC compatibility; FeltDB shares the app lifecycle.
  createTypedHandler(feltdbContracts.stop, async (_, params) => {
    const { appId } = params;

    logger.info(`Stopping FeltDB runtime for app ${appId}`);

    try {
      await getProjectStore().updateApp(appId, { feltdbStatus: "ready" });
      logger.info(`FeltDB runtime follows app ${appId} lifecycle`);
    } catch (error) {
      logger.error(`Failed to stop FeltDB for app ${appId}:`, error);
      throw new Error(`Failed to stop FeltDB: ${error}`);
    }
  });

  // Check health of FeltDB runtime
  createTypedHandler(feltdbContracts.healthCheck, async (_, params) => {
    const { appId } = params;

    logger.info(`Checking FeltDB health for app ${appId}`);

    const appData = await getProjectStore().getApp(appId);
    if (!appData) {
      return {
        healthy: false,
        message: "App not found",
      };
    }

    if (
      appData.feltdbRuntime &&
      appData.feltdbMode &&
      appData.feltdbStatus === "ready"
    ) {
      return {
        healthy: true,
        message: "FeltDB is healthy",
      };
    }

    return {
      healthy: false,
      message: `FeltDB status: ${appData.feltdbStatus}`,
    };
  });

  // Set app to use a managed FeltDB project
  createTypedHandler(feltdbContracts.setManagedProject, async (_, params) => {
    const { appId, projectId, accountId } = params;

    logger.info(
      `Setting managed FeltDB project for app ${appId}: projectId=${projectId}, accountId=${accountId}`,
    );

    await getProjectStore().updateApp(appId, {
      feltdbMode: "managed",
      feltdbProjectId: projectId,
      feltdbAccountId: accountId,
      feltdbStatus: "ready",
    });

    logger.info(`Managed FeltDB project set for app ${appId}`);
  });

  // List managed FeltDB projects for an account
  createTypedHandler(feltdbContracts.listManagedProjects, async (_, params) => {
    const { accountId } = params;

    logger.info(`Listing managed FeltDB projects for account ${accountId}`);

    const credential = await getFeltDBCredentials(accountId);
    if (!credential) throw new Error("Managed FeltDB is not configured.");
    const projects = await listFeltDBProjects(credential);
    return projects.map((project) => ({
      ...project,
      mode: "managed" as const,
    }));
  });

  // Authenticate with managed FeltDB
  createTypedHandler(feltdbContracts.authenticateManaged, async (_, params) => {
    logger.info(`Authenticating with managed FeltDB`);

    try {
      const credential = {
        accessToken: params.accessToken,
        accountId: params.accountId,
        email: params.email ?? "",
        apiUrl: params.apiUrl,
      };
      await listFeltDBProjects(credential);
      await storeFeltDBCredentials(credential);
      return { id: params.accountId, email: params.email };
    } catch (error) {
      logger.error(`Failed to authenticate with FeltDB:`, error);
      throw new Error(`Authentication failed: ${error}`);
    }
  });

  createTypedHandler(feltdbContracts.getManagedAccount, async () => {
    return (await getStoredFeltDBAccount()) ?? undefined;
  });

  // Disconnect from managed FeltDB
  createTypedHandler(feltdbContracts.disconnectManaged, async (_, params) => {
    const { appId } = params;

    logger.info(`Disconnecting managed FeltDB for app ${appId}`);

    await getProjectStore().updateApp(appId, {
      feltdbMode: "local",
      feltdbProjectId: null,
      feltdbAccountId: null,
    });

    logger.info(`Managed FeltDB disconnected for app ${appId}`);
  });

  // Test-only handler: fake connect
  testOnlyHandle(
    "feltdb:fake-connect",
    async (event, params: { appId: number; runtime: string; mode: string }) => {
      const { appId, runtime, mode } = params;

      logger.info(
        `Fake FeltDB connect for app ${appId}: runtime=${runtime}, mode=${mode}`,
      );

      await getProjectStore().updateApp(appId, {
        feltdbRuntime: runtime as "server" | "browser" | "managed" | undefined,
        feltdbMode: mode as "local" | "managed" | undefined,
        feltdbStatus: "ready",
      });

      logger.info(`Fake FeltDB connection established for app ${appId}`);
    },
  );
}
