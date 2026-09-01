import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// FeltDB Schemas
// =============================================================================

export const FeltDBRuntimeSchema = z.enum(["server", "browser", "managed"]);
export type FeltDBRuntime = z.infer<typeof FeltDBRuntimeSchema>;

export const FeltDBModeSchema = z.enum(["local", "managed"]);
export type FeltDBMode = z.infer<typeof FeltDBModeSchema>;

export const FeltDBStatusSchema = z.enum(["ready", "initializing", "failed"]);
export type FeltDBStatus = z.infer<typeof FeltDBStatusSchema>;

export const FeltDBConnectionSchema = z.object({
  runtime: FeltDBRuntimeSchema,
  mode: FeltDBModeSchema,
  status: FeltDBStatusSchema.optional(),
  projectId: z.string().optional(),
  accountId: z.string().optional(),
});

export type FeltDBConnection = z.infer<typeof FeltDBConnectionSchema>;

export const FeltDBProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: FeltDBModeSchema,
});

export type FeltDBProject = z.infer<typeof FeltDBProjectSchema>;

export const FeltDBAccountSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
});

export type FeltDBAccount = z.infer<typeof FeltDBAccountSchema>;

// =============================================================================
// FeltDB Parameter Schemas
// =============================================================================

export const InitializeFeltDBParamsSchema = z.object({
  appId: z.number(),
  runtime: FeltDBRuntimeSchema,
  mode: FeltDBModeSchema,
});

export type InitializeFeltDBParams = z.infer<
  typeof InitializeFeltDBParamsSchema
>;

export const GetFeltDBStatusParamsSchema = z.object({
  appId: z.number(),
});

export type GetFeltDBStatusParams = z.infer<typeof GetFeltDBStatusParamsSchema>;

export const SetManagedProjectParamsSchema = z.object({
  appId: z.number(),
  projectId: z.string(),
  accountId: z.string(),
});

export type SetManagedProjectParams = z.infer<
  typeof SetManagedProjectParamsSchema
>;

export const ListManagedProjectsParamsSchema = z.object({
  accountId: z.string(),
});

export type ListManagedProjectsParams = z.infer<
  typeof ListManagedProjectsParamsSchema
>;

export const AuthenticateManagedParamsSchema = z.object({
  email: z.string().optional(),
});

export type AuthenticateManagedParams = z.infer<
  typeof AuthenticateManagedParamsSchema
>;

// =============================================================================
// FeltDB Contracts
// =============================================================================

export const feltdbContracts = {
  // Initialize local FeltDB for an app
  initialize: defineContract({
    channel: "feltdb:initialize",
    input: InitializeFeltDBParamsSchema,
    output: FeltDBConnectionSchema,
  }),

  // Get current FeltDB connection status
  getStatus: defineContract({
    channel: "feltdb:get-status",
    input: GetFeltDBStatusParamsSchema,
    output: FeltDBConnectionSchema.optional(),
  }),

  // Start local FeltDB runtime
  start: defineContract({
    channel: "feltdb:start",
    input: z.object({ appId: z.number() }),
    output: z.void(),
  }),

  // Stop local FeltDB runtime
  stop: defineContract({
    channel: "feltdb:stop",
    input: z.object({ appId: z.number() }),
    output: z.void(),
  }),

  // Check health of FeltDB runtime
  healthCheck: defineContract({
    channel: "feltdb:health-check",
    input: z.object({ appId: z.number() }),
    output: z.object({
      healthy: z.boolean(),
      message: z.string().optional(),
    }),
  }),

  // Set app to use a managed FeltDB project
  setManagedProject: defineContract({
    channel: "feltdb:set-managed-project",
    input: SetManagedProjectParamsSchema,
    output: z.void(),
  }),

  // List managed FeltDB projects for an account
  listManagedProjects: defineContract({
    channel: "feltdb:list-managed-projects",
    input: ListManagedProjectsParamsSchema,
    output: z.array(FeltDBProjectSchema),
  }),

  // Authenticate with managed FeltDB
  authenticateManaged: defineContract({
    channel: "feltdb:authenticate-managed",
    input: AuthenticateManagedParamsSchema,
    output: FeltDBAccountSchema,
  }),

  // Disconnect from managed FeltDB
  disconnectManaged: defineContract({
    channel: "feltdb:disconnect-managed",
    input: z.object({ appId: z.number() }),
    output: z.void(),
  }),

  // Test-only channel: fake connect
  fakeConnect: defineContract({
    channel: "feltdb:fake-connect",
    input: z.object({
      appId: z.number(),
      runtime: FeltDBRuntimeSchema,
      mode: FeltDBModeSchema,
    }),
    output: z.void(),
  }),
} as const;

// =============================================================================
// FeltDB Client
// =============================================================================

export const feltdbClient = createClient(feltdbContracts);
