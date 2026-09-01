import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";
import { ConversionPlanSchema } from "./conversion-analysis";

// =============================================================================
// Execution Status Enum
// =============================================================================

export const ConversionExecutionStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "COMPLETED",
  "FAILED",
  "ROLLED_BACK",
]);

export type ConversionExecutionStatus = z.infer<
  typeof ConversionExecutionStatusSchema
>;

// =============================================================================
// Git Checkpoint
// =============================================================================

export const GitCheckpointSchema = z.object({
  checkpointId: z.string(),
  conversionId: z.string(),
  appId: z.number(),
  commitSha: z.string(), // SHA before conversion
  branch: z.string(),
  workingTreeState: z.enum(["clean", "dirty"]),
  timestamp: z.date(),
  message: z.string(),
});

export type GitCheckpoint = z.infer<typeof GitCheckpointSchema>;

// =============================================================================
// Conversion Execution Record
// =============================================================================

export const ConversionExecutionRecordSchema = z.object({
  conversionId: z.string(),
  appId: z.number(),
  status: ConversionExecutionStatusSchema,
  plan: ConversionPlanSchema,
  checkpoint: GitCheckpointSchema.optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failureReason: z.string().optional(),
  appliedChanges: z
    .object({
      filesModified: z.array(z.string()),
      filesCreated: z.array(z.string()),
      filesDeleted: z.array(z.string()),
      commitSha: z.string().optional(),
    })
    .optional(),
  workspaceDirectory: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ConversionExecutionRecord = z.infer<
  typeof ConversionExecutionRecordSchema
>;

// =============================================================================
// Execution Responses
// =============================================================================

export const ApproveConversionParamsSchema = z.object({
  appId: z.number(),
});

export type ApproveConversionParams = z.infer<
  typeof ApproveConversionParamsSchema
>;

export const ApproveConversionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ApproveConversionResult = z.infer<
  typeof ApproveConversionResultSchema
>;

export const ExecuteConversionParamsSchema = z.object({
  appId: z.number(),
});

export type ExecuteConversionParams = z.infer<
  typeof ExecuteConversionParamsSchema
>;

export const ExecuteConversionResultSchema = z.object({
  conversionId: z.string(),
  status: ConversionExecutionStatusSchema,
  checkpointId: z.string(),
  workspaceDirectory: z.string(),
  message: z.string(),
});

export type ExecuteConversionResult = z.infer<
  typeof ExecuteConversionResultSchema
>;

export const GetConversionExecutionParamsSchema = z.object({
  appId: z.number(),
});

export type GetConversionExecutionParams = z.infer<
  typeof GetConversionExecutionParamsSchema
>;

export const GetConversionExecutionResultSchema =
  ConversionExecutionRecordSchema.optional();

export type GetConversionExecutionResult = z.infer<
  typeof GetConversionExecutionResultSchema
>;

export const RollbackConversionParamsSchema = z.object({
  conversionId: z.string(),
  checkpointId: z.string(),
});

export type RollbackConversionParams = z.infer<
  typeof RollbackConversionParamsSchema
>;

export const RollbackConversionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  commitSha: z.string().optional(),
});

export type RollbackConversionResult = z.infer<
  typeof RollbackConversionResultSchema
>;

// =============================================================================
// IPC Contracts
// =============================================================================

export const conversionExecutionContracts = {
  approveConversion: defineContract({
    channel: "approve-conversion",
    input: ApproveConversionParamsSchema,
    output: ApproveConversionResultSchema,
  }),

  executeConversion: defineContract({
    channel: "execute-conversion",
    input: ExecuteConversionParamsSchema,
    output: ExecuteConversionResultSchema,
  }),

  getConversionExecution: defineContract({
    channel: "get-conversion-execution",
    input: GetConversionExecutionParamsSchema,
    output: GetConversionExecutionResultSchema,
  }),

  rollbackConversion: defineContract({
    channel: "rollback-conversion",
    input: RollbackConversionParamsSchema,
    output: RollbackConversionResultSchema,
  }),
} as const;

// =============================================================================
// Client
// =============================================================================

export const conversionExecutionClient = createClient(
  conversionExecutionContracts,
);
