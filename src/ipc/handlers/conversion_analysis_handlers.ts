import { getProjectStore } from "../../store";
import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { runFullAnalysis } from "../../import";
import { getConversionPlanStore } from "../../store/conversion_plan_store";
import { getDyadAppPath } from "../../paths/paths";
import { discoverJavaScriptProject } from "@/import/project_discovery";
import type { ConversionPlan } from "@/ipc/types/conversion-analysis";

const logger = log.scope("conversion_analysis_handlers");
const handle = createLoggedHandler(logger);

function resolveAnalysisPath(appRecord: {
  path: string;
  name: string;
}): string {
  const storedPath = getDyadAppPath(appRecord.path);
  if (discoverJavaScriptProject(storedPath)) return storedPath;

  const nameBasedPath = getDyadAppPath(appRecord.name);
  if (
    nameBasedPath !== storedPath &&
    discoverJavaScriptProject(nameBasedPath)
  ) {
    logger.warn(
      `Stored app path ${storedPath} is stale; analyzing ${nameBasedPath}`,
    );
    return nameBasedPath;
  }
  throw new Error(
    `The source project is unavailable. No package.json was found at ${storedPath} or ${nameBasedPath}. Reconnect or re-import the complete source folder before reviewing or approving a conversion.`,
  );
}

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
      const appPath = resolveAnalysisPath(appRecord);
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
      const appPath = resolveAnalysisPath(appRecord);
      const store = await getConversionPlanStore(appPath);
      const storedPlan = await store.getPlan(params.appId);
      let plan: ConversionPlan | null = storedPlan;

      // Plans created before workspace discovery only inspected the repository
      // root. Rebuild those empty plans so existing imports benefit from the
      // corrected analyzer without requiring the user to import them again.
      if (
        !plan ||
        plan.analysisVersion !== 2 ||
        plan.applicationAnalysis.framework === "UNKNOWN" ||
        plan.simplification?.locEstimateAvailable !== false
      ) {
        plan = await runFullAnalysis(params.appId, appPath);
        await store.savePlan(params.appId, plan);
        logger.info(
          `Generated current conversion plan for app ${params.appId}`,
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
