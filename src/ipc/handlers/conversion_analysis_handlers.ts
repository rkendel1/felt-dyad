import { db } from "../../db";
import { apps } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { runFullAnalysis } from "../../import";
import { getConversionPlanStore } from "../../store/conversion_plan_store";

const logger = log.scope("conversion_analysis_handlers");
const handle = createLoggedHandler(logger);

export function registerConversionAnalysisHandlers() {
  handle(
    "start-app-analysis",
    async (event, params: { appId: number }) => {
      try {
        logger.info(`Starting analysis for app ${params.appId}`);

        // Get the app to find its path
        const appRecord = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!appRecord) {
          throw new Error(`App with ID ${params.appId} not found`);
        }

        // Run the full analysis
        const conversionPlan = await runFullAnalysis(
          params.appId,
          appRecord.path,
        );

        // Persist to FeltDB
        const store = await getConversionPlanStore(appRecord.path);
        const planId = await store.savePlan(params.appId, conversionPlan);

        logger.info(
          `Analysis completed for app ${params.appId}: ${conversionPlan.uiChanges.length} UI changes, ${conversionPlan.backendAnalysis.apiRoutes.length} API routes, ${conversionPlan.warnings?.length || 0} warnings. Saved to FeltDB as ${planId}`,
        );

        return {
          conversionPlanId: planId,
          status: "COMPLETED",
        };
      } catch (error) {
        logger.error(`Error in start-app-analysis:`, error);
        throw error;
      }
    },
  );

  handle(
    "get-conversion-plan",
    async (event, params: { appId: number }) => {
      try {
        // Get the app to find its path
        const appRecord = await db.query.apps.findFirst({
          where: eq(apps.id, params.appId),
        });

        if (!appRecord) {
          return undefined;
        }

        // Retrieve from FeltDB
        const store = await getConversionPlanStore(appRecord.path);
        const plan = await store.getPlan(params.appId);

        if (plan) {
          logger.info(`Retrieved conversion plan for app ${params.appId}`);
        }

        return plan || undefined;
      } catch (error) {
        logger.error(`Error in get-conversion-plan:`, error);
        throw error;
      }
    },
  );
}

