import { createFeltDB } from "@feltdb/core";
import type { ConversionPlan } from "@/ipc/types/conversion-analysis";
import log from "electron-log";

const logger = log.scope("conversion_plan_store");

/**
 * Manages conversion plan persistence in FeltDB
 * Stores analysis results that are generated when importing applications
 */
export class ConversionPlanStore {
  private db: ReturnType<typeof createFeltDB> | null = null;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Initialize the FeltDB instance for conversion plans
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    try {
      const dbPath = `${this.projectPath}/.feltdb`;
      this.db = createFeltDB({
        namespace: "builder-conversions",
        path: dbPath,
      });

      // Ensure collection exists
      await this.ensureCollectionInitialized();
      logger.info(`ConversionPlanStore initialized at ${dbPath}`);
    } catch (error) {
      logger.error(`Failed to initialize ConversionPlanStore:`, error);
      throw error;
    }
  }

  /**
   * Ensure the conversionPlans collection exists
   */
  private async ensureCollectionInitialized(): Promise<void> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const conversionPlans = this.db.collection("conversion_plans");
    await conversionPlans.all(); // Trigger initialization
  }

  /**
   * Save a conversion plan to FeltDB
   */
  async savePlan(appId: number, plan: ConversionPlan): Promise<string> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const conversionPlans = this.db.collection("conversion_plans");

    // Serialize the plan for storage
    const docData = {
      analysis_version: plan.analysisVersion,
      app_id: appId,
      status: plan.status,
      summary: plan.summary,
      application_analysis: plan.applicationAnalysis,
      state_analysis: plan.stateAnalysis,
      backend_analysis: plan.backendAnalysis,
      data_analysis: plan.dataAnalysis,
      external_services: plan.externalServices,
      ui_changes: plan.uiChanges,
      warnings: plan.warnings,
      manual_decisions: plan.manualDecisions,
      simplification: plan.simplification,
      target_runtime: plan.targetRuntime,
      created_at: plan.createdAt.getTime(),
      updated_at: plan.updatedAt.getTime(),
    };

    try {
      // Check if plan exists for this appId
      const existing = await this.getPlan(appId);

      if (existing) {
        // Update existing - FeltDB doesn't have update, so delete and recreate
        const conversionPlans2 = this.db.collection("conversion_plans");
        await (conversionPlans2 as any).delete(existing.id);
        const docId = await conversionPlans.insert(docData);
        logger.info(`Updated conversion plan for app ${appId}`);
        return docId;
      } else {
        // Create new
        const docId = await conversionPlans.insert(docData);
        logger.info(`Saved new conversion plan for app ${appId}: ${docId}`);
        return docId;
      }
    } catch (error) {
      logger.error(`Failed to save conversion plan for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a conversion plan from FeltDB
   */
  async getPlan(
    appId: number,
  ): Promise<(ConversionPlan & { id: string }) | null> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const conversionPlans = this.db.collection("conversion_plans");

    try {
      const all = (await conversionPlans.all()) as any[];
      const doc = all.find((d) => d.app_id === appId);

      if (!doc) return null;

      // Deserialize back to ConversionPlan
      return {
        analysisVersion: doc.analysis_version,
        id: doc.id,
        appId: doc.app_id,
        status: doc.status,
        summary: doc.summary,
        applicationAnalysis: doc.application_analysis,
        stateAnalysis: doc.state_analysis,
        backendAnalysis: doc.backend_analysis,
        dataAnalysis: doc.data_analysis,
        externalServices: doc.external_services,
        uiChanges: doc.ui_changes,
        warnings: doc.warnings,
        manualDecisions: doc.manual_decisions,
        simplification: doc.simplification,
        targetRuntime: doc.target_runtime,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      };
    } catch (error) {
      logger.error(`Failed to get conversion plan for app ${appId}:`, error);
      return null;
    }
  }

  /**
   * List all conversion plans
   */
  async listPlans(): Promise<Array<ConversionPlan & { id: string }>> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const conversionPlans = this.db.collection("conversion_plans");

    try {
      const all = (await conversionPlans.all()) as any[];

      return all.map((doc) => ({
        analysisVersion: doc.analysis_version,
        id: doc.id,
        appId: doc.app_id,
        status: doc.status,
        summary: doc.summary,
        applicationAnalysis: doc.application_analysis,
        stateAnalysis: doc.state_analysis,
        backendAnalysis: doc.backend_analysis,
        dataAnalysis: doc.data_analysis,
        externalServices: doc.external_services,
        uiChanges: doc.ui_changes,
        warnings: doc.warnings,
        manualDecisions: doc.manual_decisions,
        simplification: doc.simplification,
        targetRuntime: doc.target_runtime,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      }));
    } catch (error) {
      logger.error(`Failed to list conversion plans:`, error);
      return [];
    }
  }

  /**
   * Delete a conversion plan
   */
  async deletePlan(appId: number): Promise<boolean> {
    if (!this.db) throw new Error("FeltDB not initialized");

    const conversionPlans = this.db.collection("conversion_plans");

    try {
      const plan = await this.getPlan(appId);
      if (!plan) return false;

      await (conversionPlans as any).delete(plan.id);
      logger.info(`Deleted conversion plan for app ${appId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete conversion plan for app ${appId}:`, error);
      return false;
    }
  }
}

// Global store instances per project path
const storeInstances = new Map<string, ConversionPlanStore>();

/**
 * Get or create a conversion plan store for a project
 */
export async function getConversionPlanStore(
  projectPath: string,
): Promise<ConversionPlanStore> {
  if (!storeInstances.has(projectPath)) {
    const store = new ConversionPlanStore(projectPath);
    await store.initialize();
    storeInstances.set(projectPath, store);
  }

  return storeInstances.get(projectPath)!;
}
