import { createLoggedHandler } from "./safe_handle";
import log from "electron-log";
import { getProjectStore } from "../../store";
import { getDyadAppPath } from "../../paths/paths";
import { getConversionPlanStore } from "../../store/conversion_plan_store";
import { createConversionExecutor } from "../../main/conversion_executor";
import { ConversionWorkspaceManager } from "../../main/conversion_workspace";
import { ConversionCheckpointManager } from "../../ipc/utils/conversion_checkpoint";
import type {
  ApproveConversionParams,
  ExecuteConversionParams,
  GetConversionExecutionParams,
  RollbackConversionParams,
} from "../types/conversion-execution";

const logger = log.scope("conversion_execution_handlers");
const handle = createLoggedHandler(logger);

export function registerConversionExecutionHandlers() {
  /**
   * Approve a conversion plan for execution
   * This is a hard boundary - only PENDING_APPROVAL plans can be approved
   */
  handle(
    "approve-conversion",
    async (event, params: ApproveConversionParams) => {
      try {
        logger.info(`Approving conversion for app ${params.appId}`);

        // Get the app
        const appRecord = await getProjectStore().getApp(params.appId);

        if (!appRecord) {
          throw new Error(`App with ID ${params.appId} not found`);
        }

        // Get the conversion plan
        const appPath = getDyadAppPath(appRecord.path);
        const store = await getConversionPlanStore(appPath);
        const plan = await store.getPlan(params.appId);

        if (!plan) {
          throw new Error(
            `No conversion plan found for app ${params.appId}. Run analysis first.`,
          );
        }

        // Verify plan is in PENDING_APPROVAL state
        if (plan.status !== "PENDING_APPROVAL") {
          throw new Error(
            `Cannot approve plan with status ${plan.status}. Must be PENDING_APPROVAL.`,
          );
        }

        // Update plan status to APPROVED
        plan.status = "APPROVED";
        plan.updatedAt = new Date();
        await store.savePlan(params.appId, plan);

        logger.info(`Conversion approved for app ${params.appId}`);

        return {
          success: true,
          message: `Conversion plan approved for app ${params.appId}. Ready for execution.`,
        };
      } catch (error) {
        logger.error(`Error in approve-conversion:`, error);
        throw error;
      }
    },
  );

  /**
   * Execute a conversion plan
   * This converts the application to use FeltDB
   */
  handle(
    "execute-conversion",
    async (event, params: ExecuteConversionParams) => {
      try {
        logger.info(`Executing conversion for app ${params.appId}`);

        // Get the app
        const appRecord = await getProjectStore().getApp(params.appId);

        if (!appRecord) {
          throw new Error(`App with ID ${params.appId} not found`);
        }

        // Get the conversion plan
        const appPath = getDyadAppPath(appRecord.path);
        const store = await getConversionPlanStore(appPath);
        const plan = await store.getPlan(params.appId);

        if (!plan) {
          throw new Error(`No conversion plan found for app ${params.appId}.`);
        }

        // Verify plan is APPROVED
        if (plan.status !== "APPROVED") {
          throw new Error(
            `Cannot execute plan with status ${plan.status}. Must be APPROVED.`,
          );
        }

        // Create executor
        const executor = await createConversionExecutor(
          appPath,
          params.appId,
          appPath,
        );

        // Execute conversion
        const execution = await executor.executeConversion(plan);

        // Update plan status in store
        plan.status = "IN_PROGRESS";
        plan.updatedAt = new Date();
        await store.savePlan(params.appId, plan);

        logger.info(
          `Conversion execution started for app ${params.appId} with ID ${execution.conversionId}`,
        );

        return {
          conversionId: execution.conversionId,
          status: execution.status,
          checkpointId: execution.checkpoint?.checkpointId || "",
          workspaceDirectory: execution.workspaceDirectory,
          message: `Conversion execution started. Checkpoint created at ${execution.checkpoint?.commitSha}.`,
        };
      } catch (error) {
        logger.error(`Error in execute-conversion:`, error);
        throw error;
      }
    },
  );

  /**
   * Get the current execution status
   */
  handle(
    "get-conversion-execution",
    async (event, params: GetConversionExecutionParams) => {
      try {
        logger.info(`Getting conversion execution for app ${params.appId}`);

        // Get the app
        const appRecord = await getProjectStore().getApp(params.appId);

        if (!appRecord) {
          return undefined;
        }

        // Get workspace manager
        const workspaceManager = new ConversionWorkspaceManager(appRecord.path);
        const execution = await workspaceManager.findLatestExecution(
          params.appId,
        );

        if (execution) {
          logger.info(
            `Retrieved execution ${execution.conversionId} for app ${params.appId} with status ${execution.status}`,
          );
        }

        return execution || undefined;
      } catch (error) {
        logger.error(`Error in get-conversion-execution:`, error);
        throw error;
      }
    },
  );

  /**
   * Rollback a conversion using a Git checkpoint
   */
  handle(
    "rollback-conversion",
    async (event, params: RollbackConversionParams) => {
      try {
        logger.info(
          `Rolling back conversion ${params.conversionId} with checkpoint ${params.checkpointId}`,
        );

        // Get the app by finding it from the execution record
        let appRecord = null;
        let appId = 0;

        // Find app by querying all apps and checking their workspaces
        const allApps = await getProjectStore().listApps();
        for (const app of allApps) {
          const workspaceManager = new ConversionWorkspaceManager(app.path);
          const execution = await workspaceManager.loadExecution(
            params.conversionId,
          );
          if (execution) {
            appRecord = app;
            appId = execution.appId;
            break;
          }
        }

        if (!appRecord) {
          throw new Error(`Conversion ${params.conversionId} not found`);
        }

        // Create executor
        const appPath = getDyadAppPath(appRecord.path);
        const executor = await createConversionExecutor(
          appPath,
          appId,
          appRecord.path,
        );

        // Get the checkpoint
        const workspaceManager = new ConversionWorkspaceManager(appRecord.path);
        const checkpointManager = new ConversionCheckpointManager(
          workspaceManager.getWorkspaceDir(),
        );
        const checkpoint = await checkpointManager.loadCheckpoint(
          params.checkpointId,
        );

        if (!checkpoint) {
          throw new Error(`Checkpoint ${params.checkpointId} not found`);
        }

        // Execute rollback
        await executor.rollbackConversion(checkpoint);

        logger.info(
          `Successfully rolled back conversion ${params.conversionId}`,
        );

        return {
          success: true,
          message: `Conversion rolled back successfully to checkpoint ${params.checkpointId}`,
          commitSha: checkpoint.commitSha,
        };
      } catch (error) {
        logger.error(`Error in rollback-conversion:`, error);
        throw error;
      }
    },
  );
}
