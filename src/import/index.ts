import { analyzeApplication } from "./application_analyzer";
import { analyzeState } from "./state_analyzer";
import { analyzeBackend } from "./backend_analyzer";
import { analyzeData } from "./data_analyzer";
import { analyzeExternalServices } from "./external_services_analyzer";
import { analyzeSimplification } from "./simplification_analyzer";
import { generateConversionPlan } from "./conversion_plan";
import { ConversionPlan } from "@/ipc/types/conversion-analysis";
import { discoverJavaScriptProject } from "./project_discovery";

export async function runFullAnalysis(
  appId: number,
  appPath: string,
): Promise<ConversionPlan> {
  try {
    const analysisPath =
      discoverJavaScriptProject(appPath)?.rootPath ?? appPath;
    // Run all analyzers in parallel for efficiency
    const [
      applicationAnalysis,
      backendAnalysis,
      dataAnalysis,
      externalServices,
    ] = await Promise.all([
      analyzeApplication(appPath),
      analyzeBackend(analysisPath),
      analyzeData(analysisPath),
      analyzeExternalServices(analysisPath),
    ]);

    // State analysis depends on application analysis framework
    const stateAnalysis = await analyzeState(
      analysisPath,
      applicationAnalysis.framework,
    );

    // Simplification analysis depends on other analyses
    const simplificationAnalysis = await analyzeSimplification(
      applicationAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      analysisPath,
    );

    // Generate the conversion plan
    const plan = generateConversionPlan(
      appId,
      applicationAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      externalServices,
      simplificationAnalysis,
    );

    return plan;
  } catch (error) {
    console.error(`Error running full analysis for app ${appId}:`, error);
    throw error;
  }
}
