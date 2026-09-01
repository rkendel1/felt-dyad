import path from "node:path";
import log from "electron-log";
import type { ConversionPlan } from "../ipc/types/conversion-analysis";
import type {
  ConversionExecutionRecord,
  GitCheckpoint,
} from "../ipc/types/conversion-execution";
import { ConversionWorkspaceManager } from "./conversion_workspace";
import { ConversionCheckpointManager } from "../ipc/utils/conversion_checkpoint";
import { gitCheckout } from "../ipc/utils/git_utils";

const logger = log.scope("conversion_executor");

/**
 * Executes a conversion plan against an application.
 * Manages the full lifecycle of converting an app to FeltDB.
 */
export class ConversionExecutor {
  private workspaceManager: ConversionWorkspaceManager;
  private checkpointManager: ConversionCheckpointManager;
  private appPath: string;
  private appId: number;

  constructor(
    appPath: string,
    appId: number,
    workspaceManager: ConversionWorkspaceManager,
  ) {
    this.appPath = appPath;
    this.appId = appId;
    this.workspaceManager = workspaceManager;
    this.checkpointManager = new ConversionCheckpointManager(
      workspaceManager.getWorkspaceDir(),
    );
  }

  /**
   * Approve a conversion plan for execution
   * Validates that the plan is in PENDING_APPROVAL state
   */
  async approvePlan(plan: ConversionPlan): Promise<void> {
    logger.info(
      `Approving conversion plan for app ${this.appId}`,
    );

    if (plan.status !== "PENDING_APPROVAL") {
      throw new Error(
        `Cannot approve plan with status ${plan.status}. Must be PENDING_APPROVAL.`,
      );
    }

    // Update plan status in memory (will be saved during execution)
    plan.status = "APPROVED";

    logger.info(
      `Conversion plan for app ${this.appId} approved and ready for execution`,
    );
  }

  /**
   * Create a Git checkpoint before conversion
   */
  async createCheckpoint(
    conversionId: string,
  ): Promise<GitCheckpoint> {
    logger.info(
      `Creating Git checkpoint for conversion ${conversionId}`,
    );

    const checkpoint = await this.checkpointManager.createCheckpoint(
      this.appPath,
      conversionId,
    );

    // Update checkpoint with app ID
    checkpoint.appId = this.appId;

    logger.info(
      `Created checkpoint ${checkpoint.checkpointId} at commit ${checkpoint.commitSha}`,
    );

    return checkpoint;
  }

  /**
   * Begin execution of the conversion plan
   * This is the main entry point for conversion execution
   */
  async executeConversion(
    plan: ConversionPlan,
  ): Promise<ConversionExecutionRecord> {
    // Validate plan is approved
    if (plan.status !== "APPROVED") {
      throw new Error(
        `Cannot execute plan with status ${plan.status}. Must be APPROVED.`,
      );
    }

    logger.info(
      `Starting execution of conversion plan for app ${this.appId}`,
    );

    try {
      // Create execution record
      const execution = await this.workspaceManager.createExecution(
        this.appId,
        plan,
      );

      // Create Git checkpoint before any modifications
      const checkpoint = await this.createCheckpoint(execution.conversionId);
      execution.checkpoint = checkpoint;
      execution.status = "EXECUTING";
      execution.startedAt = new Date();

      await this.workspaceManager.updateExecution(execution);
      await this.workspaceManager.writeLog(
        execution.conversionId,
        `Conversion execution started for app ${this.appId}`,
      );

      // TODO: Implement actual conversion logic in Phase 2
      // This is where the plan would be applied:
      // 1. Execute UI changes
      // 2. Transform backend code
      // 3. Migrate data
      // 4. Apply external service configurations
      // 5. Update imports and connections

      logger.info(
        `Conversion execution for app ${this.appId} would proceed with actual transformations`,
      );

      // For now, mark as completed
      execution.status = "COMPLETED";
      execution.completedAt = new Date();
      execution.appliedChanges = {
        filesModified: [],
        filesCreated: [],
        filesDeleted: [],
      };

      await this.workspaceManager.updateExecution(execution);
      await this.workspaceManager.writeLog(
        execution.conversionId,
        `Conversion execution completed for app ${this.appId}`,
      );

      return execution;
    } catch (error) {
      logger.error(`Conversion execution failed for app ${this.appId}:`, error);

      const execution = await this.workspaceManager.findLatestExecution(
        this.appId,
      );
      if (execution) {
        execution.status = "FAILED";
        execution.failureReason = error instanceof Error ? error.message : String(error);
        execution.completedAt = new Date();
        await this.workspaceManager.updateExecution(execution);
        await this.workspaceManager.writeLog(
          execution.conversionId,
          `Conversion execution failed: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }

      throw error;
    }
  }

  /**
   * Rollback a conversion to the pre-conversion state using Git checkpoint
   */
  async rollbackConversion(checkpoint: GitCheckpoint): Promise<void> {
    logger.info(
      `Rolling back conversion for app ${this.appId} to checkpoint ${checkpoint.checkpointId}`,
    );

    try {
      // Reset to the checkpoint commit
      await gitCheckout({
        path: this.appPath,
        ref: checkpoint.commitSha,
      });

      logger.info(
        `Successfully rolled back to commit ${checkpoint.commitSha}`,
      );

      // Update execution record with rollback status
      const execution = await this.workspaceManager.findLatestExecution(
        this.appId,
      );
      if (execution) {
        execution.status = "ROLLED_BACK";
        execution.completedAt = new Date();
        await this.workspaceManager.updateExecution(execution);
        await this.workspaceManager.writeLog(
          execution.conversionId,
          `Conversion rolled back to checkpoint ${checkpoint.checkpointId}`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to rollback conversion for app ${this.appId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get the current execution status
   */
  async getExecutionStatus(): Promise<ConversionExecutionRecord | null> {
    return await this.workspaceManager.findLatestExecution(this.appId);
  }
}

/**
 * Factory to create a conversion executor
 */
export async function createConversionExecutor(
  appPath: string,
  appId: number,
  projectPath: string,
): Promise<ConversionExecutor> {
  const workspaceManager = new ConversionWorkspaceManager(projectPath);
  await workspaceManager.initialize();
  return new ConversionExecutor(appPath, appId, workspaceManager);
}
