import { getProjectStore } from "../../store";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { runFullAnalysis } from "../../import";
import { getConversionPlanStore } from "../../store/conversion_plan_store";
import { getDyadAppPath } from "../../paths/paths";

const logger = log.scope("conversion_analysis_handlers");
const handle = createLoggedHandler(logger);

export function registerConversionAnalysisHandlers() {
  handle("start-app-analysis", async (event, params: { appId: number }) => {
    try {
      logger.info(`Starting analysis for app ${params.appId}`);

      // Get the app to find its path
      const appRecord = await getProjectStore().getApp(params.appId);

      if (!appRecord) {
        throw new Error(`App with ID ${params.appId} not found`);
      }

      // Run the full analysis
      const appPath = getDyadAppPath(appRecord.path);
      const conversionPlan = await runFullAnalysis(params.appId, appPath);

      // Persist to FeltDB
      const store = await getConversionPlanStore(appPath);
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
  });

  handle("get-conversion-plan", async (event, params: { appId: number }) => {
    try {
      // Get the app to find its path
      const appRecord = await getProjectStore().getApp(params.appId);

      if (!appRecord) {
        return undefined;
      }

      // Retrieve from FeltDB
      const store = await getConversionPlanStore(
        getDyadAppPath(appRecord.path),
      );
      let plan = await store.getPlan(params.appId);

      // Plans created before workspace discovery only inspected the repository
      // root. Rebuild those empty plans so existing imports benefit from the
      // corrected analyzer without requiring the user to import them again.
      if (plan?.applicationAnalysis.framework === "UNKNOWN") {
        const appPath = getDyadAppPath(appRecord.path);
        plan = await runFullAnalysis(params.appId, appPath);
        await store.savePlan(params.appId, plan);
        logger.info(
          `Re-analyzed stale conversion plan for app ${params.appId}`,
        );
      }

      if (plan) {
        logger.info(`Retrieved conversion plan for app ${params.appId}`);
      }

      return plan || undefined;
    } catch (error) {
      logger.error(`Error in get-conversion-plan:`, error);
      throw error;
    }
  });
}
