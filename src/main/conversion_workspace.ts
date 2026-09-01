import fs from "node:fs";
import path from "node:path";
import { promises as fsPromises } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import log from "electron-log";
import type { ConversionExecutionRecord } from "../ipc/types/conversion-execution";
import type { ConversionPlan } from "../ipc/types/conversion-analysis";

const logger = log.scope("conversion_workspace");

/**
 * Manages the durable conversion execution workspace.
 * Records all conversion attempts, progress, and metadata.
 */
export class ConversionWorkspaceManager {
  private projectPath: string;
  private workspaceDir: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.workspaceDir = path.join(projectPath, ".feltdb", "conversion");
  }

  /**
   * Initialize the workspace directory structure
   */
  async initialize(): Promise<void> {
    try {
      // Create directory structure
      await fsPromises.mkdir(path.join(this.workspaceDir, "executions"), {
        recursive: true,
      });
      await fsPromises.mkdir(path.join(this.workspaceDir, "checkpoints"), {
        recursive: true,
      });
      await fsPromises.mkdir(path.join(this.workspaceDir, "logs"), {
        recursive: true,
      });

      logger.info(`Initialized conversion workspace at ${this.workspaceDir}`);
    } catch (error) {
      logger.error("Failed to initialize conversion workspace:", error);
      throw error;
    }
  }

  /**
   * Create a new conversion execution record
   */
  async createExecution(
    appId: number,
    plan: ConversionPlan,
  ): Promise<ConversionExecutionRecord> {
    try {
      const conversionId = uuidv4();
      const executionDir = path.join(this.workspaceDir, "executions", conversionId);

      // Create execution directory
      await fsPromises.mkdir(executionDir, { recursive: true });

      const record: ConversionExecutionRecord = {
        conversionId,
        appId,
        status: "PENDING_APPROVAL",
        plan,
        workspaceDirectory: executionDir,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save execution record
      const recordFile = path.join(executionDir, "execution.json");
      await fsPromises.writeFile(
        recordFile,
        JSON.stringify(
          {
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
            plan: {
              ...record.plan,
              createdAt: record.plan.createdAt.toISOString(),
              updatedAt: record.plan.updatedAt.toISOString(),
            },
          },
          null,
          2,
        ),
      );

      logger.info(
        `Created execution record ${conversionId} for app ${appId}`,
      );

      return record;
    } catch (error) {
      logger.error(`Failed to create execution record:`, error);
      throw error;
    }
  }

  /**
   * Load an execution record by ID
   */
  async loadExecution(
    conversionId: string,
  ): Promise<ConversionExecutionRecord | null> {
    try {
      const recordFile = path.join(
        this.workspaceDir,
        "executions",
        conversionId,
        "execution.json",
      );

      if (!fs.existsSync(recordFile)) {
        return null;
      }

      const data = await fsPromises.readFile(recordFile, "utf-8");
      const record = JSON.parse(data);

      // Convert string dates back to Date objects
      record.createdAt = new Date(record.createdAt);
      record.updatedAt = new Date(record.updatedAt);
      record.plan.createdAt = new Date(record.plan.createdAt);
      record.plan.updatedAt = new Date(record.plan.updatedAt);

      if (record.checkpoint?.timestamp) {
        record.checkpoint.timestamp = new Date(record.checkpoint.timestamp);
      }
      if (record.startedAt) {
        record.startedAt = new Date(record.startedAt);
      }
      if (record.completedAt) {
        record.completedAt = new Date(record.completedAt);
      }

      return record as ConversionExecutionRecord;
    } catch (error) {
      logger.error(
        `Failed to load execution record ${conversionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find the latest execution for an app
   */
  async findLatestExecution(
    appId: number,
  ): Promise<ConversionExecutionRecord | null> {
    try {
      const executionsDir = path.join(this.workspaceDir, "executions");

      if (!fs.existsSync(executionsDir)) {
        return null;
      }

      const conversionIds = await fsPromises.readdir(executionsDir);
      const executions: ConversionExecutionRecord[] = [];

      for (const conversionId of conversionIds) {
        const execution = await this.loadExecution(conversionId);
        if (execution && execution.appId === appId) {
          executions.push(execution);
        }
      }

      // Return most recently updated
      return executions.length > 0
        ? executions.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
          )[0]
        : null;
    } catch (error) {
      logger.error(`Failed to find latest execution for app ${appId}:`, error);
      return null;
    }
  }

  /**
   * Update an execution record status and metadata
   */
  async updateExecution(
    record: ConversionExecutionRecord,
  ): Promise<void> {
    try {
      const recordFile = path.join(
        this.workspaceDir,
        "executions",
        record.conversionId,
        "execution.json",
      );

      record.updatedAt = new Date();

      await fsPromises.writeFile(
        recordFile,
        JSON.stringify(
          {
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
            plan: {
              ...record.plan,
              createdAt: record.plan.createdAt.toISOString(),
              updatedAt: record.plan.updatedAt.toISOString(),
            },
            checkpoint: record.checkpoint
              ? {
                  ...record.checkpoint,
                  timestamp: record.checkpoint.timestamp.toISOString(),
                }
              : undefined,
            startedAt: record.startedAt?.toISOString(),
            completedAt: record.completedAt?.toISOString(),
          },
          null,
          2,
        ),
      );

      logger.info(
        `Updated execution record ${record.conversionId} to status ${record.status}`,
      );
    } catch (error) {
      logger.error(
        `Failed to update execution record ${record.conversionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Write a log entry for an execution
   */
  async writeLog(
    conversionId: string,
    message: string,
    level: "info" | "error" | "warn" = "info",
  ): Promise<void> {
    try {
      const logFile = path.join(
        this.workspaceDir,
        "logs",
        `${conversionId}.log`,
      );

      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

      await fsPromises.appendFile(logFile, logEntry);
    } catch (error) {
      logger.error(`Failed to write log for ${conversionId}:`, error);
      // Don't throw, logging failures shouldn't stop execution
    }
  }

  /**
   * Get the workspace directory path
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }
}

/**
 * Get or create a workspace manager for a project
 */
export async function createWorkspaceManager(
  projectPath: string,
): Promise<ConversionWorkspaceManager> {
  const manager = new ConversionWorkspaceManager(projectPath);
  await manager.initialize();
  return manager;
}
