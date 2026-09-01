import { analyzeApplication } from "./application_analyzer";
import { analyzeState } from "./state_analyzer";
import { analyzeBackend } from "./backend_analyzer";
import { analyzeData } from "./data_analyzer";
import { analyzeExternalServices } from "./external_services_analyzer";
import { generateConversionPlan } from "./conversion_plan";
import { ConversionPlan } from "@/ipc/types/conversion-analysis";

export async function runFullAnalysis(
  appId: number,
  appPath: string,
): Promise<ConversionPlan> {
  try {
    // Run all analyzers in parallel for efficiency
    const [
      applicationAnalysis,
      backendAnalysis,
      dataAnalysis,
      externalServices,
    ] = await Promise.all([
      analyzeApplication(appPath),
      analyzeBackend(appPath),
      analyzeData(appPath),
      analyzeExternalServices(appPath),
    ]);

    // State analysis depends on application analysis framework
    const stateAnalysis = await analyzeState(
      appPath,
      applicationAnalysis.framework,
    );

    // Generate the conversion plan
    const plan = generateConversionPlan(
      appId,
      applicationAnalysis,
      stateAnalysis,
      backendAnalysis,
      dataAnalysis,
      externalServices,
    );

    return plan;
  } catch (error) {
    console.error(`Error running full analysis for app ${appId}:`, error);
    throw error;
  }
}
