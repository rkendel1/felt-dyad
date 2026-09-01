import log from "electron-log";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { apps } from "../../db/schema";
import { createTypedHandler } from "./base";
import { createTestOnlyLoggedHandler } from "./safe_handle";
import { feltdbContracts } from "../types/feltdb";
import { feltdbRuntimeManager } from "../../main/feltdb_runtime_manager";

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
    await db
      .update(apps)
      .set({
        feltdbRuntime: runtime,
        feltdbMode: mode,
        feltdbStatus: "initializing",
      })
      .where(eq(apps.id, appId));

    logger.info(`FeltDB initialized for app ${appId}`);

    return {
      runtime,
      mode,
      status: "initializing" as const,
    };
  });

  // Get current FeltDB connection status
  createTypedHandler(feltdbContracts.getStatus, async (_, params) => {
    const { appId } = params;

    const app = await db
      .select()
      .from(apps)
      .where(eq(apps.id, appId))
      .limit(1);

    if (app.length === 0) {
      logger.warn(`App with ID ${appId} not found`);
      return undefined;
    }

    const appData = app[0];
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

  // Start local FeltDB runtime
  createTypedHandler(feltdbContracts.start, async (_, params) => {
    const { appId } = params;

    logger.info(`Starting FeltDB runtime for app ${appId}`);

    try {
      // Update status to initializing
      await db
        .update(apps)
        .set({ feltdbStatus: "initializing" })
        .where(eq(apps.id, appId));

      // Start the FeltDB runtime
      const port = await feltdbRuntimeManager.startFeltDB(appId);

      // Update status to ready
      await db
        .update(apps)
        .set({ feltdbStatus: "ready" })
        .where(eq(apps.id, appId));

      logger.info(
        `FeltDB runtime started for app ${appId} on port ${port}`,
      );

      return {
        status: "ready" as const,
      };
    } catch (error) {
      logger.error(`Failed to start FeltDB for app ${appId}:`, error);
      await db
        .update(apps)
        .set({ feltdbStatus: "failed" })
        .where(eq(apps.id, appId));
      throw new Error(`Failed to start FeltDB: ${error}`);
    }
  });

  // Stop local FeltDB runtime
  createTypedHandler(feltdbContracts.stop, async (_, params) => {
    const { appId } = params;

    logger.info(`Stopping FeltDB runtime for app ${appId}`);

    try {
      // Stop the FeltDB runtime
      await feltdbRuntimeManager.stopFeltDB(appId);

      // Update status
      await db
        .update(apps)
        .set({ feltdbStatus: "ready" })
        .where(eq(apps.id, appId));

      logger.info(`FeltDB runtime stopped for app ${appId}`);
    } catch (error) {
      logger.error(`Failed to stop FeltDB for app ${appId}:`, error);
      throw new Error(`Failed to stop FeltDB: ${error}`);
    }
  });

  // Check health of FeltDB runtime
  createTypedHandler(feltdbContracts.healthCheck, async (_, params) => {
    const { appId } = params;

    logger.info(`Checking FeltDB health for app ${appId}`);

    const app = await db
      .select()
      .from(apps)
      .where(eq(apps.id, appId))
      .limit(1);

    if (app.length === 0) {
      return {
        healthy: false,
        message: "App not found",
      };
    }

    const appData = app[0];
    if (!appData.feltdbStatus || appData.feltdbStatus === "ready") {
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

    await db
      .update(apps)
      .set({
        feltdbMode: "managed",
        feltdbProjectId: projectId,
        feltdbAccountId: accountId,
        feltdbStatus: "ready",
      })
      .where(eq(apps.id, appId));

    logger.info(`Managed FeltDB project set for app ${appId}`);
  });

  // List managed FeltDB projects for an account
  createTypedHandler(
    feltdbContracts.listManagedProjects,
    async (_, params) => {
      const { accountId } = params;

      logger.info(`Listing managed FeltDB projects for account ${accountId}`);

      // In a real implementation, this would:
      // 1. Authenticate with FeltDB API
      // 2. Fetch projects for the account
      // 3. Return the list

      // For now, return empty list
      return [];
    },
  );

  // Authenticate with managed FeltDB
  createTypedHandler(
    feltdbContracts.authenticateManaged,
    async () => {
      logger.info(`Authenticating with managed FeltDB`);

      try {
        // For now, return a stub account
        // In production, this would:
        // 1. Launch OAuth flow
        // 2. Exchange auth code for token
        // 3. Store credentials securely
        // 4. Return account info

        return {
          id: `account-${Date.now()}`,
          email: "user@example.com",
          name: "User",
        };
      } catch (error) {
        logger.error(`Failed to authenticate with FeltDB:`, error);
        throw new Error(`Authentication failed: ${error}`);
      }
    },
  );

  // Disconnect from managed FeltDB
  createTypedHandler(feltdbContracts.disconnectManaged, async (_, params) => {
    const { appId } = params;

    logger.info(`Disconnecting managed FeltDB for app ${appId}`);

    await db
      .update(apps)
      .set({
        feltdbMode: "local",
        feltdbProjectId: null,
        feltdbAccountId: null,
      })
      .where(eq(apps.id, appId));

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

      await db
        .update(apps)
        .set({
          feltdbRuntime:
            runtime as "server" | "browser" | "managed" | undefined,
          feltdbMode: mode as "local" | "managed" | undefined,
          feltdbStatus: "ready",
        })
        .where(eq(apps.id, appId));

      logger.info(`Fake FeltDB connection established for app ${appId}`);
    },
  );
}
