import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// State Classification Enums
// =============================================================================

export const StateDependencyClassificationSchema = z.enum([
  "REPLACE_WITH_FELTDB",
  "KEEP_EXTERNAL",
  "MOVE_TO_FELTDB",
  "KEEP_SERVER_SIDE",
  "REQUIRES_ADAPTER",
  "REVIEW",
  "KEEP_LOCAL",
]);

export type StateDependencyClassification = z.infer<
  typeof StateDependencyClassificationSchema
>;

// =============================================================================
// Framework and Technology Detection
// =============================================================================

export const FrameworkTypeSchema = z.enum([
  "REACT",
  "VUE",
  "ANGULAR",
  "SVELTE",
  "SOLID",
  "OTHER",
  "UNKNOWN",
]);

export type FrameworkType = z.infer<typeof FrameworkTypeSchema>;

export const BackendFrameworkSchema = z.enum([
  "NEXT_JS",
  "EXPRESS",
  "FASTIFY",
  "NEST_JS",
  "DJANGO",
  "FLASK",
  "RAILS",
  "OTHER",
  "NONE",
]);

export type BackendFramework = z.infer<typeof BackendFrameworkSchema>;

export const DatabaseTypeSchema = z.enum([
  "POSTGRESQL",
  "MYSQL",
  "MONGODB",
  "SQLITE",
  "FIRESTORE",
  "DYNAMODB",
  "OTHER",
  "NONE",
]);

export type DatabaseType = z.infer<typeof DatabaseTypeSchema>;

// =============================================================================
// Application Analysis
// =============================================================================

export const ApplicationAnalysisSchema = z.object({
  framework: FrameworkTypeSchema,
  packageManager: z.enum(["npm", "yarn", "pnpm", "bun", "unknown"]),
  entryPoints: z.array(z.string()),
  routes: z.array(
    z.object({
      path: z.string(),
      file: z.string(),
      type: z.enum(["page", "api", "layout"]),
    }),
  ),
  components: z.array(
    z.object({
      name: z.string(),
      file: z.string(),
      usesState: z.boolean(),
    }),
  ),
  buildSystem: z.enum(["vite", "webpack", "next", "other", "unknown"]),
});

export type ApplicationAnalysis = z.infer<typeof ApplicationAnalysisSchema>;

// =============================================================================
// State Analysis
// =============================================================================

export const StateSourceSchema = z.object({
  name: z.string(),
  type: z.enum([
    "REACT_STATE",
    "REACT_CONTEXT",
    "REDUX",
    "ZUSTAND",
    "JOTAI",
    "RECOIL",
    "VUE_STATE",
    "PINIA",
    "VUEX",
    "LOCALSTORAGE",
    "SESSION_STORAGE",
    "INDEXED_DB",
    "CLIENT_CACHE",
    "API_RESPONSE",
    "OTHER",
  ]),
  file: z.string().optional(),
  description: z.string().optional(),
  classification: StateDependencyClassificationSchema,
  details: z.record(z.any()).optional(),
});

export type StateSource = z.infer<typeof StateSourceSchema>;

export const StateAnalysisSchema = z.object({
  sources: z.array(StateSourceSchema),
  totalStates: z.number(),
  analyzedFiles: z.number(),
});

export type StateAnalysis = z.infer<typeof StateAnalysisSchema>;

// =============================================================================
// Backend Analysis
// =============================================================================

export const ApiRouteSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
  file: z.string(),
  description: z.string().optional(),
  classification: StateDependencyClassificationSchema,
  requiresAuth: z.boolean().optional(),
  externalIntegration: z.string().optional(),
});

export type ApiRoute = z.infer<typeof ApiRouteSchema>;

export const BackendAnalysisSchema = z.object({
  framework: BackendFrameworkSchema,
  apiRoutes: z.array(ApiRouteSchema),
  serverActions: z.array(
    z.object({
      name: z.string(),
      file: z.string(),
      description: z.string().optional(),
    }),
  ),
  databaseORM: z.string().optional(),
  hasDatabaseClient: z.boolean(),
});

export type BackendAnalysis = z.infer<typeof BackendAnalysisSchema>;

// =============================================================================
// Data Analysis
// =============================================================================

export const DatabaseSchemaSchema = z.object({
  name: z.string(),
  tables: z.array(
    z.object({
      name: z.string(),
      rowCount: z.number().optional(),
      fields: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          nullable: z.boolean().optional(),
        }),
      ),
      relationships: z.array(z.string()).optional(),
    }),
  ),
});

export type DatabaseSchema = z.infer<typeof DatabaseSchemaSchema>;

export const DataAnalysisSchema = z.object({
  database: DatabaseTypeSchema,
  schema: DatabaseSchemaSchema.optional(),
  totalTables: z.number(),
  totalRecords: z.number().optional(),
  excludedFields: z.array(z.string()).optional(),
  seedData: z.boolean().optional(),
  migrations: z.boolean().optional(),
});

export type DataAnalysis = z.infer<typeof DataAnalysisSchema>;

// =============================================================================
// External Services Analysis
// =============================================================================

export const ExternalServiceSchema = z.object({
  name: z.string(),
  type: z.enum([
    "AUTHENTICATION",
    "PAYMENTS",
    "EMAIL",
    "STORAGE",
    "ANALYTICS",
    "WEBHOOKS",
    "API",
    "DATABASE",
    "OTHER",
  ]),
  file: z.string().optional(),
  usedFor: z.string(),
  classification: StateDependencyClassificationSchema,
});

export type ExternalService = z.infer<typeof ExternalServiceSchema>;

// =============================================================================
// UI Change Classification
// =============================================================================

export const UiChangeSchema = z.object({
  component: z.string(),
  file: z.string(),
  currentPattern: z.string(),
  proposedPattern: z.string(),
  impact: z.string(),
  isManual: z.boolean().optional(),
});

export type UiChange = z.infer<typeof UiChangeSchema>;

// =============================================================================
// Simplification Analysis
// =============================================================================

export const ComplexityMetricsSchema = z.object({
  currentLOC: z.number(),
  removableLOC: z.number(),
  replaceableLOC: z.number(),
  unchangedLOC: z.number(),
  estimatedReductionPercent: z.number(),
});

export type ComplexityMetrics = z.infer<typeof ComplexityMetricsSchema>;

export const ComplexityCategoryRemovalSchema = z.object({
  category: z.string(),
  current: z.union([z.number(), z.string()]),
  estimated: z.union([z.number(), z.string()]),
  changePercent: z.number(),
  unit: z.string(),
});

export type ComplexityCategoryRemoval = z.infer<
  typeof ComplexityCategoryRemovalSchema
>;

export const StatePlumbingFlowSchema = z.object({
  description: z.string(),
  steps: z.array(z.string()),
  canBeEliminated: z.boolean(),
  canBeConsolidated: z.boolean(),
  requiresReview: z.boolean().optional(),
});

export type StatePlumbingFlow = z.infer<typeof StatePlumbingFlowSchema>;

export const SimplificationAnalysisSchema = z.object({
  locEstimateAvailable: z.boolean().optional(),
  complexity: ComplexityMetricsSchema,
  categoryRemovals: z.array(ComplexityCategoryRemovalSchema),
  statePlumbingFlows: z.array(StatePlumbingFlowSchema),
  flowStats: z.object({
    canBeEliminated: z.number(),
    canBeConsolidated: z.number(),
    shouldRemain: z.number(),
  }),
  newFeltDBCode: z.number(),
  newConcepts: z.array(z.string()),
  netEstimatedReduction: z.number(),
  estimatedAfterLOC: z.object({
    low: z.number(),
    high: z.number(),
  }),
});

export type SimplificationAnalysis = z.infer<
  typeof SimplificationAnalysisSchema
>;

// =============================================================================
// Conversion Plan
// =============================================================================

export const ConversionPlanSchema = z.object({
  analysisVersion: z.number().optional(),
  sourceFingerprint: z.string().optional(),
  appId: z.number(),
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "IN_PROGRESS", "COMPLETED"]),
  applicationAnalysis: ApplicationAnalysisSchema,
  stateAnalysis: StateAnalysisSchema,
  backendAnalysis: BackendAnalysisSchema,
  dataAnalysis: DataAnalysisSchema,
  externalServices: z.array(ExternalServiceSchema),
  uiChanges: z.array(UiChangeSchema),
  simplification: SimplificationAnalysisSchema.optional(),
  summary: z.string(),
  warnings: z.array(z.string()).optional(),
  manualDecisions: z
    .array(
      z.object({
        item: z.string(),
        reason: z.string(),
        recommendation: z.string(),
      }),
    )
    .optional(),
  // Target runtime for conversion (always FeltDB)
  targetRuntime: z
    .object({
      provider: z.literal("feltdb"),
      runtime: z.enum(["server", "browser"]).default("server"),
      mode: z.enum(["local", "managed"]).default("local"),
    })
    .optional()
    .default({
      provider: "feltdb",
      runtime: "server",
      mode: "local",
    }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ConversionPlan = z.infer<typeof ConversionPlanSchema>;

// =============================================================================
// Analysis Request/Response
// =============================================================================

export const StartAppAnalysisParamsSchema = z.object({
  appId: z.number(),
});

export type StartAppAnalysisParams = z.infer<
  typeof StartAppAnalysisParamsSchema
>;

export const StartAppAnalysisResultSchema = z.object({
  conversionPlanId: z.string(),
  status: z.string(),
});

export type StartAppAnalysisResult = z.infer<
  typeof StartAppAnalysisResultSchema
>;

export const GetConversionPlanParamsSchema = z.object({
  appId: z.number(),
});

export type GetConversionPlanParams = z.infer<
  typeof GetConversionPlanParamsSchema
>;

export const GetConversionPlanResultSchema = ConversionPlanSchema.optional();

export type GetConversionPlanResult = z.infer<
  typeof GetConversionPlanResultSchema
>;

// =============================================================================
// Conversion Analysis Contracts
// =============================================================================

export const conversionAnalysisContracts = {
  startAppAnalysis: defineContract({
    channel: "start-app-analysis",
    input: StartAppAnalysisParamsSchema,
    output: StartAppAnalysisResultSchema,
  }),

  getConversionPlan: defineContract({
    channel: "get-conversion-plan",
    input: GetConversionPlanParamsSchema,
    output: GetConversionPlanResultSchema,
  }),
} as const;

// =============================================================================
// Client
// =============================================================================

export const conversionAnalysisClient = createClient(
  conversionAnalysisContracts,
);
