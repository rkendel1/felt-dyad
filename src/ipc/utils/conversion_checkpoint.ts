import fs from "node:fs";
import path from "node:path";
import { promises as fsPromises } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import log from "electron-log";
import type { GitCheckpoint } from "../types/conversion-execution";
import { getCurrentCommitHash, gitCurrentBranch, getGitUncommittedFilesWithStatus } from "./git_utils";

const logger = log.scope("conversion_checkpoint");

/**
 * Manages Git checkpoints for conversion execution.
 * Records the pre-conversion state so conversions can be rolled back.
 */
export class ConversionCheckpointManager {
  private conversionDir: string;

  constructor(conversionDir: string) {
    this.conversionDir = conversionDir;
  }

  /**
   * Create a checkpoint before conversion starts
   */
  async createCheckpoint(
    appPath: string,
    conversionId: string,
  ): Promise<GitCheckpoint> {
    try {
      // Get current Git state
      const commitSha = await getCurrentCommitHash({ path: appPath });
      const branch = await gitCurrentBranch({ path: appPath });
      const uncommittedFiles = await getGitUncommittedFilesWithStatus({
        path: appPath,
      });
      const workingTreeState = uncommittedFiles.length === 0 ? "clean" : "dirty";

      const checkpointId = uuidv4();
      const checkpoint: GitCheckpoint = {
        checkpointId,
        conversionId,
        appId: 0, // Will be set by caller
        commitSha,
        branch,
        workingTreeState,
        timestamp: new Date(),
        message: `Pre-conversion checkpoint for FeltDB migration`,
      };

      // Ensure checkpoint directory exists
      const checkpointDir = path.join(
        this.conversionDir,
        "checkpoints",
        checkpointId,
      );
      await fsPromises.mkdir(checkpointDir, { recursive: true });

      // Save checkpoint metadata
      const checkpointFile = path.join(checkpointDir, "checkpoint.json");
      await fsPromises.writeFile(
        checkpointFile,
        JSON.stringify(checkpoint, null, 2),
      );

      // Save Git state
      const gitStateFile = path.join(checkpointDir, "git-state.json");
      await fsPromises.writeFile(
        gitStateFile,
        JSON.stringify(
          {
            commitSha,
            branch,
            workingTreeState,
            uncommittedFiles,
          },
          null,
          2,
        ),
      );

      logger.info(
        `Created checkpoint ${checkpointId} for conversion ${conversionId}`,
      );

      return checkpoint;
    } catch (error) {
      logger.error(`Failed to create checkpoint for conversion ${conversionId}:`, error);
      throw error;
    }
  }

  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(checkpointId: string): Promise<GitCheckpoint | null> {
    try {
      const checkpointFile = path.join(
        this.conversionDir,
        "checkpoints",
        checkpointId,
        "checkpoint.json",
      );

      if (!fs.existsSync(checkpointFile)) {
        return null;
      }

      const data = await fsPromises.readFile(checkpointFile, "utf-8");
      const checkpoint = JSON.parse(data) as GitCheckpoint;

      // Convert string dates back to Date objects
      checkpoint.timestamp = new Date(checkpoint.timestamp);

      return checkpoint;
    } catch (error) {
      logger.error(`Failed to load checkpoint ${checkpointId}:`, error);
      return null;
    }
  }

  /**
   * Get the pre-conversion commit SHA from a checkpoint
   */
  async getCheckpointCommitSha(checkpointId: string): Promise<string | null> {
    try {
      const checkpoint = await this.loadCheckpoint(checkpointId);
      return checkpoint?.commitSha || null;
    } catch (error) {
      logger.error(`Failed to get checkpoint commit SHA:`, error);
      return null;
    }
  }

  /**
   * List all checkpoints in the conversion workspace
   */
  async listCheckpoints(): Promise<GitCheckpoint[]> {
    try {
      const checkpointsDir = path.join(this.conversionDir, "checkpoints");

      if (!fs.existsSync(checkpointsDir)) {
        return [];
      }

      const checkpointIds = await fsPromises.readdir(checkpointsDir);
      const checkpoints: GitCheckpoint[] = [];

      for (const checkpointId of checkpointIds) {
        const checkpoint = await this.loadCheckpoint(checkpointId);
        if (checkpoint) {
          checkpoints.push(checkpoint);
        }
      }

      return checkpoints.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    } catch (error) {
      logger.error(`Failed to list checkpoints:`, error);
      return [];
    }
  }
}

/**
 * Get or create a checkpoint manager for a conversion workspace
 */
export function createCheckpointManager(
  conversionDir: string,
): ConversionCheckpointManager {
  return new ConversionCheckpointManager(conversionDir);
}
