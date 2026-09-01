/**
 * Application Intelligence IPC Handlers
 *
 * Provides IPC endpoints for:
 * - Indexing applications
 * - Retrieving application intelligence
 * - Resolving application context
 * - Storing decisions and changes
 * - Reconciliation
 */

import { ipcMain } from "electron";
import { z } from "zod";
import log from "electron-log";
import {
  IndexApplicationSchema,
  IndexApplicationResponseSchema,
  GetApplicationIntelligenceSchema,
  GetApplicationIntelligenceResponseSchema,
  GetApplicationContextSchema,
  GetApplicationContextResponseSchema,
  StoreDecisionSchema,
  StoreDecisionResponseSchema,
  RecordChangeSchema,
  RecordChangeResponseSchema,
  GetReconciliationStatusSchema,
  GetReconciliationStatusResponseSchema,
  ReindexApplicationSchema,
  ReindexApplicationResponseSchema,
} from "@/ipc/types/application-intelligence-contracts";
import { RepositoryIntelligenceIndexer } from "@/import/repository_intelligence_indexer";
import {
  ApplicationContextResolver,
  generateAIPrompt,
} from "@/import/application_context_resolver";

const logger = log.scope("application-intelligence");

// Store for in-memory intelligence data
const applicationIntelligenceStore = new Map<
  string,
  {
    application: any;
    components: any[];
    routes: any[];
    pages: any[];
    features: any[];
    stateSources: any[];
    collections: any[];
    serverActions: any[];
    externalServices: any[];
    dependencies: any[];
  }
>();

/**
 * Register IPC handlers
 */
export function registerApplicationIntelligenceHandlers() {
  // Index Application
  ipcMain.handle(
    "application-intelligence:index",
    async (_event: Electron.IpcMainInvokeEvent, input: unknown) => {
      try {
        const validatedInput = IndexApplicationSchema.parse(input);

      logger.info(`Indexing application ${validatedInput.appId}`);

      // TODO: Get app path from database
      // TODO: Get framework from database
      // For now, using placeholder values
      const appPath = "/tmp/app";
      const framework = "REACT";
      const appId = `app-${validatedInput.appId}`;

      const indexer = new RepositoryIntelligenceIndexer(
        appPath,
        framework as any,
        appId
      );
      const result = await indexer.index();

      // Store in memory
      applicationIntelligenceStore.set(appId, {
        application: result.application,
        components: result.components,
        routes: result.routes,
        pages: result.pages,
        features: result.features,
        stateSources: result.stateSources,
        collections: result.collections,
        serverActions: result.serverActions,
        externalServices: result.externalServices,
        dependencies: result.dependencies,
      });

      const response = IndexApplicationResponseSchema.parse({
        applicationId: appId,
        entitiesDiscovered:
          result.components.length +
          result.routes.length +
          result.pages.length +
          result.features.length +
          result.stateSources.length +
          result.collections.length +
          result.serverActions.length +
          result.externalServices.length,
        componentsFound: result.components.length,
        routesFound: result.routes.length,
        pagesFound: result.pages.length,
        featuresInferred: result.features.length,
        servicesFound: result.externalServices.length,
        indexedAt: result.application.lastIndexedAt,
      });

      logger.info(
        `Successfully indexed application: ${JSON.stringify(response)}`
      );
      return response;
    } catch (error) {
      logger.error("Error indexing application:", error);
      throw error;
    }
  });

  // Get Application Intelligence
  ipcMain.handle(
    "application-intelligence:get",
    async (_event: Electron.IpcMainInvokeEvent, input: unknown) => {
      try {
        const validatedInput = GetApplicationIntelligenceSchema.parse(input);
        const appId = `app-${validatedInput.appId}`;

        const intelligence = applicationIntelligenceStore.get(appId);
        if (!intelligence) {
          throw new Error(
            `No application intelligence found for app ${validatedInput.appId}`
          );
        }

        const response = GetApplicationIntelligenceResponseSchema.parse({
          application: intelligence.application,
          components: intelligence.components,
          routes: intelligence.routes,
          pages: intelligence.pages,
          features: intelligence.features,
          stateSources: intelligence.stateSources,
          collections: intelligence.collections,
          serverActions: intelligence.serverActions,
          externalServices: intelligence.externalServices,
          dependencies: intelligence.dependencies,
        });

        return response;
      } catch (error) {
        logger.error("Error retrieving application intelligence:", error);
        throw error;
      }
    }
  );

  // Get Application Context
  ipcMain.handle(
    "application-intelligence:get-context",
    async (_event: Electron.IpcMainInvokeEvent, input: unknown) => {
      try {
        const validatedInput = GetApplicationContextSchema.parse(input);
        const appId = `app-${validatedInput.appId}`;

        const intelligence = applicationIntelligenceStore.get(appId);
        if (!intelligence) {
          throw new Error(
            `No application intelligence found for app ${validatedInput.appId}`
          );
        }

        // Build entity map
        const entityMap = new Map<string, any>();

        for (const component of intelligence.components) {
          entityMap.set(component.id, component);
        }
        for (const route of intelligence.routes) {
          entityMap.set(route.id, route);
        }
        for (const page of intelligence.pages) {
          entityMap.set(page.id, page);
        }
        for (const feature of intelligence.features) {
          entityMap.set(feature.id, feature);
        }
        for (const state of intelligence.stateSources) {
          entityMap.set(state.id, state);
        }
        for (const collection of intelligence.collections) {
          entityMap.set(collection.id, collection);
        }
        for (const action of intelligence.serverActions) {
          entityMap.set(action.id, action);
        }
        for (const service of intelligence.externalServices) {
          entityMap.set(service.id, service);
        }

        // Resolve context
        const selectedComponent = validatedInput.selectedComponent || intelligence.components[0]?.id || "unknown";
        const selectedType = selectedComponent.startsWith("component-")
          ? "component"
          : "unknown";

        const context = ApplicationContextResolver.resolve({
          selectedEntity: selectedComponent,
          selectedEntityType: selectedType,
          userRequest: validatedInput.request || "",
          applicationEntities: entityMap,
          applicationDependencies: intelligence.dependencies,
          decisions: [], // TODO: Load from database
          recentChanges: [], // TODO: Load from database
        });

        const response = GetApplicationContextResponseSchema.parse(context);
        return response;
      } catch (error) {
        logger.error("Error retrieving application context:", error);
        throw error;
      }
    }
  );

  // Store Decision
  ipcMain.handle<unknown, unknown>("application-intelligence:store-decision", async (_event: Electron.IpcMainInvokeEvent, input: unknown) => {
    try {
      const validatedInput = StoreDecisionSchema.parse(input);

      logger.info(
        `Storing decision for app ${validatedInput.appId}: ${validatedInput.decision.title}`
      );

      // TODO: Store in FeltDB
      // For now, just log it

      const response = StoreDecisionResponseSchema.parse({
        id: validatedInput.decision.id,
        success: true,
      });

      return response;
    } catch (error) {
      logger.error("Error storing decision:", error);
      throw error;
    }
  });

  // Record Change
  ipcMain.handle<unknown, unknown>("application-intelligence:record-change", async (_event: Electron.IpcMainInvokeEvent, input: unknown) => {
    try {
      const validatedInput = RecordChangeSchema.parse(input);

      logger.info(
        `Recording change for app ${validatedInput.appId}: ${validatedInput.change.request}`
      );

      // TODO: Store in FeltDB
      // For now, just log it

      const response = RecordChangeResponseSchema.parse({
        id: validatedInput.change.id,
        success: true,
      });

      return response;
    } catch (error) {
      logger.error("Error recording change:", error);
      throw error;
    }
  });

  // Get Reconciliation Status
  ipcMain.handle(
    "application-intelligence:get-reconciliation-status",
    async (_event: Electron.IpcMainInvokeEvent, input) => {
      try {
        const validatedInput = GetReconciliationStatusSchema.parse(input);
        const appId = `app-${validatedInput.appId}`;

        const intelligence = applicationIntelligenceStore.get(appId);
        if (!intelligence) {
          throw new Error(
            `No application intelligence found for app ${validatedInput.appId}`
          );
        }

        const now = Date.now();
        const lastIndexed = intelligence.application.lastIndexedAt;
        const timeSinceIndex = now - lastIndexed;

        // Simple heuristic: if indexed less than 1 minute ago, synchronized
        const status =
          timeSinceIndex < 60000 ? ("synchronized" as const) : ("out_of_sync" as const);

        const response = GetReconciliationStatusResponseSchema.parse({
          status,
          lastIndexedAt: lastIndexed,
          filesChanged: 0, // TODO: Detect changed files
          componentsAdded: 0,
          componentsRemoved: 0,
        });

        return response;
      } catch (error) {
        logger.error("Error retrieving reconciliation status:", error);
        throw error;
      }
    }
  );

  // Reindex Application
  ipcMain.handle(
    "application-intelligence:reindex",
    async (_event: Electron.IpcMainInvokeEvent, input) => {
      try {
        const validatedInput = ReindexApplicationSchema.parse(input);

        logger.info(
          `Reindexing application ${validatedInput.appId} (full: ${validatedInput.full})`
        );

        // TODO: Implement incremental indexing
        // For now, always do full reindex

        const appId = `app-${validatedInput.appId}`;

        // TODO: Get app path from database
        // TODO: Get framework from database
        const appPath = "/tmp/app";
        const framework = "REACT";

        const indexer = new RepositoryIntelligenceIndexer(
          appPath,
          framework as any,
          appId
        );
        const result = await indexer.index();

        // Update store
        applicationIntelligenceStore.set(appId, {
          application: result.application,
          components: result.components,
          routes: result.routes,
          pages: result.pages,
          features: result.features,
          stateSources: result.stateSources,
          collections: result.collections,
          serverActions: result.serverActions,
          externalServices: result.externalServices,
          dependencies: result.dependencies,
        });

        const response = ReindexApplicationResponseSchema.parse({
          applicationId: appId,
          reindexedAt: result.application.lastIndexedAt,
          success: true,
        });

        return response;
      } catch (error) {
        logger.error("Error reindexing application:", error);
        throw error;
      }
    }
  );
}
