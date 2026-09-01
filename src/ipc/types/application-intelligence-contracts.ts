import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";
import {
  ApplicationEntitySchema,
  ComponentEntitySchema,
  RouteEntitySchema,
  PageEntitySchema,
  FeatureEntitySchema,
  StateSourceEntitySchema,
  CollectionEntitySchema,
  ServerActionEntitySchema,
  ExternalServiceEntitySchema,
  DependencyEntitySchema,
  DecisionEntitySchema,
  ChangeEntitySchema,
  ApplicationContextSchema,
  ReconciliationStatusSchema,
} from "./application-intelligence";

/**
 * IPC Contracts for Application Intelligence
 */

// Index/Scan Operations
export const IndexApplicationSchema = z.object({
  appId: z.number(),
  full: z.boolean().optional().default(true),
});

export type IndexApplicationRequest = z.infer<typeof IndexApplicationSchema>;

export const IndexApplicationResponseSchema = z.object({
  applicationId: z.string(),
  entitiesDiscovered: z.number(),
  componentsFound: z.number(),
  routesFound: z.number(),
  pagesFound: z.number(),
  featuresInferred: z.number(),
  servicesFound: z.number(),
  indexedAt: z.number(),
});

export type IndexApplicationResponse = z.infer<
  typeof IndexApplicationResponseSchema
>;

// Get Application Intelligence
export const GetApplicationIntelligenceSchema = z.object({
  appId: z.number(),
});

export type GetApplicationIntelligenceRequest = z.infer<
  typeof GetApplicationIntelligenceSchema
>;

export const GetApplicationIntelligenceResponseSchema = z.object({
  application: ApplicationEntitySchema,
  components: z.array(ComponentEntitySchema),
  routes: z.array(RouteEntitySchema),
  pages: z.array(PageEntitySchema),
  features: z.array(FeatureEntitySchema),
  stateSources: z.array(StateSourceEntitySchema),
  collections: z.array(CollectionEntitySchema),
  serverActions: z.array(ServerActionEntitySchema),
  externalServices: z.array(ExternalServiceEntitySchema),
  dependencies: z.array(DependencyEntitySchema),
  decisions: z.array(DecisionEntitySchema),
  recentChanges: z.array(ChangeEntitySchema).optional(),
});

export type GetApplicationIntelligenceResponse = z.infer<
  typeof GetApplicationIntelligenceResponseSchema
>;

// Get Application Context
export const GetApplicationContextSchema = z.object({
  appId: z.number(),
  selectedComponent: z.string().optional(),
  request: z.string().optional(),
});

export type GetApplicationContextRequest = z.infer<
  typeof GetApplicationContextSchema
>;

export const GetApplicationContextResponseSchema = ApplicationContextSchema;
export type GetApplicationContextResponse = z.infer<
  typeof GetApplicationContextResponseSchema
>;

// Store Decision
export const StoreDecisionSchema = z.object({
  appId: z.number(),
  decision: DecisionEntitySchema,
});

export type StoreDecisionRequest = z.infer<typeof StoreDecisionSchema>;

export const StoreDecisionResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
});

export type StoreDecisionResponse = z.infer<typeof StoreDecisionResponseSchema>;

// Record Change
export const RecordChangeSchema = z.object({
  appId: z.number(),
  change: ChangeEntitySchema,
});

export type RecordChangeRequest = z.infer<typeof RecordChangeSchema>;

export const RecordChangeResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
});

export type RecordChangeResponse = z.infer<typeof RecordChangeResponseSchema>;

// Get Reconciliation Status
export const GetReconciliationStatusSchema = z.object({
  appId: z.number(),
});

export type GetReconciliationStatusRequest = z.infer<
  typeof GetReconciliationStatusSchema
>;

export const GetReconciliationStatusResponseSchema = ReconciliationStatusSchema;
export type GetReconciliationStatusResponse = z.infer<
  typeof GetReconciliationStatusResponseSchema
>;

// Re-index Application
export const ReindexApplicationSchema = z.object({
  appId: z.number(),
  full: z.boolean().optional().default(false),
});

export type ReindexApplicationRequest = z.infer<
  typeof ReindexApplicationSchema
>;

export const ReindexApplicationResponseSchema = z.object({
  applicationId: z.string(),
  reindexedAt: z.number(),
  success: z.boolean(),
});

export type ReindexApplicationResponse = z.infer<
  typeof ReindexApplicationResponseSchema
>;

// =============================================================================
// Application Intelligence Contracts
// =============================================================================

export const applicationIntelligenceContracts = {
  index: defineContract({
    channel: "application-intelligence:index",
    input: IndexApplicationSchema,
    output: IndexApplicationResponseSchema,
  }),
  get: defineContract({
    channel: "application-intelligence:get",
    input: GetApplicationIntelligenceSchema,
    output: GetApplicationIntelligenceResponseSchema,
  }),
  getContext: defineContract({
    channel: "application-intelligence:get-context",
    input: GetApplicationContextSchema,
    output: GetApplicationContextResponseSchema,
  }),
  storeDecision: defineContract({
    channel: "application-intelligence:store-decision",
    input: StoreDecisionSchema,
    output: StoreDecisionResponseSchema,
  }),
  recordChange: defineContract({
    channel: "application-intelligence:record-change",
    input: RecordChangeSchema,
    output: RecordChangeResponseSchema,
  }),
  getReconciliationStatus: defineContract({
    channel: "application-intelligence:get-reconciliation-status",
    input: GetReconciliationStatusSchema,
    output: GetReconciliationStatusResponseSchema,
  }),
  reindex: defineContract({
    channel: "application-intelligence:reindex",
    input: ReindexApplicationSchema,
    output: ReindexApplicationResponseSchema,
  }),
} as const;

// Export typed client
export const applicationIntelligenceClient = createClient(
  applicationIntelligenceContracts,
);

export type ApplicationIntelligenceClient =
  typeof applicationIntelligenceClient;
