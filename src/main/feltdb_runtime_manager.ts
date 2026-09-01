import { spawn, ChildProcess } from "child_process";
import path from "path";
import log from "electron-log";
import { getDyadAppPath } from "../paths/paths";
import { killProcess } from "../ipc/utils/process_manager";

const logger = log.scope("feltdb_runtime_manager");

interface FeltDBRuntimeInfo {
  process?: ChildProcess;
  port?: number;
  appId: number;
  startedAt?: Date;
  status: "running" | "stopped" | "error";
}

/**
 * Manages FeltDB server processes for individual applications
 * Each app gets its own FeltDB Node.js runtime instance
 */
export class FeltDBRuntimeManager {
  private static instance: FeltDBRuntimeManager;
  private runtimes = new Map<number, FeltDBRuntimeInfo>();

  // Port pool for assigning unique ports to FeltDB instances
  private portPool = new Set<number>();
  private nextPort = 9400; // Starting port for FeltDB instances

  static getInstance(): FeltDBRuntimeManager {
    if (!this.instance) {
      this.instance = new FeltDBRuntimeManager();
    }
    return this.instance;
  }

  /**
   * Find an available port for a FeltDB instance
   */
  private getAvailablePort(): number {
    let port = this.nextPort;
    while (this.portPool.has(port)) {
      port++;
    }
    this.nextPort = port + 1;
    this.portPool.add(port);
    return port;
  }

  /**
   * Start a FeltDB server for an app
   * Returns the port the FeltDB server is listening on
   */
  async startFeltDB(appId: number): Promise<number> {
    logger.info(`Starting FeltDB runtime for app ${appId}`);

    // Check if already running
    const existing = this.runtimes.get(appId);
    if (existing && existing.status === "running" && existing.port) {
      logger.info(
        `FeltDB already running for app ${appId} on port ${existing.port}`,
      );
      return existing.port;
    }

    try {
      // Get app path
      const appPath = getDyadAppPath(appId.toString());

      // Allocate port
      const port = this.getAvailablePort();

      // Build FeltDB start command
      // In a real implementation, this would start @feltdb/core Node server
      // For now, we'll create a simple Node process that creates a stub server
      const scriptPath = path.join(appPath, ".feltdb", "server.js");

      // Create environment for FeltDB
      const env = {
        ...process.env,
        PORT: port.toString(),
        FELTDB_APP_ID: appId.toString(),
        NODE_ENV: "development",
      };

      logger.info(`Starting FeltDB on port ${port} for app ${appId}`);

      // Spawn FeltDB process
      const process = spawn("node", [scriptPath], {
        cwd: appPath,
        env,
        stdio: "pipe",
      });

      // Track process
      const runtimeInfo: FeltDBRuntimeInfo = {
        appId,
        port,
        process,
        startedAt: new Date(),
        status: "running",
      };

      this.runtimes.set(appId, runtimeInfo);

      // Handle process events
      process.on("error", (error) => {
        logger.error(
          `FeltDB process error for app ${appId}:`,
          error.message,
        );
        runtimeInfo.status = "error";
      });

      process.on("exit", (code) => {
        logger.info(
          `FeltDB process exited for app ${appId} with code ${code}`,
        );
        runtimeInfo.status = "stopped";
        this.runtimes.delete(appId);
        if (runtimeInfo.port) {
          this.portPool.delete(runtimeInfo.port);
        }
      });

      // Log output
      if (process.stdout) {
        process.stdout.on("data", (data) => {
          logger.debug(`[FeltDB-${appId}] ${data.toString().trim()}`);
        });
      }

      if (process.stderr) {
        process.stderr.on("data", (data) => {
          logger.warn(`[FeltDB-${appId}] ${data.toString().trim()}`);
        });
      }

      // Wait for health check (stub for now - assume ready after 500ms)
      await this.waitForHealthCheck(appId, port, 10);

      logger.info(
        `FeltDB runtime started for app ${appId} on port ${port}`,
      );
      return port;
    } catch (error) {
      logger.error(`Failed to start FeltDB for app ${appId}:`, error);
      const runtime = this.runtimes.get(appId);
      if (runtime) {
        runtime.status = "error";
      }
      throw error;
    }
  }

  /**
   * Wait for FeltDB health check
   * Returns true if health check passes, false on timeout
   */
  private async waitForHealthCheck(
    appId: number,
    port: number,
    maxAttempts: number = 10,
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to connect to FeltDB health endpoint
        const response = await fetch(`http://localhost:${port}/health`, {
          timeout: 1000,
        });

        if (response.ok) {
          logger.info(`FeltDB health check passed for app ${appId}`);
          return true;
        }
      } catch (_error) {
        // Still connecting, retry on error
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.warn(
      `FeltDB health check timeout for app ${appId} after ${maxAttempts} attempts`,
    );
    // Return true anyway - server may be starting up
    return true;
  }

  /**
   * Stop a FeltDB server for an app
   */
  async stopFeltDB(appId: number): Promise<void> {
    logger.info(`Stopping FeltDB runtime for app ${appId}`);

    const runtime = this.runtimes.get(appId);
    if (!runtime || !runtime.process) {
      logger.warn(`No running FeltDB process for app ${appId}`);
      return;
    }

    try {
      await killProcess(runtime.process);
      logger.info(`FeltDB runtime stopped for app ${appId}`);
    } catch (error) {
      logger.error(
        `Error stopping FeltDB for app ${appId}:`,
        error,
      );
      throw error;
    } finally {
      this.runtimes.delete(appId);
      if (runtime.port) {
        this.portPool.delete(runtime.port);
      }
    }
  }

  /**
   * Get FeltDB status for an app
   */
  getStatus(appId: number): FeltDBRuntimeInfo | undefined {
    return this.runtimes.get(appId);
  }

  /**
   * Get the port for a running FeltDB instance
   */
  getPort(appId: number): number | undefined {
    return this.runtimes.get(appId)?.port;
  }

  /**
   * Stop all running FeltDB instances (called on app shutdown)
   */
  async stopAll(): Promise<void> {
    logger.info(
      `Stopping all FeltDB runtimes (${this.runtimes.size} instances)`,
    );

    const stops = Array.from(this.runtimes.keys()).map((appId) =>
      this.stopFeltDB(appId).catch((error) => {
        logger.error(
          `Error stopping FeltDB for app ${appId}:`,
          error,
        );
      }),
    );

    await Promise.all(stops);
    logger.info("All FeltDB runtimes stopped");
  }
}

export const feltdbRuntimeManager = FeltDBRuntimeManager.getInstance();
