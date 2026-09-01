import { z } from "zod";

/**
 * Application Intelligence Types
 *
 * Represents the durable, FeltDB-backed application intelligence layer.
 * Understands relationships between UI components, source files, routes,
 * features, state, and external services.
 */

// =============================================================================
// Evidence & Confidence
// =============================================================================

/**
 * How we know something (observed from code, inferred from patterns, user-confirmed)
 */
export const EvidenceSourceSchema = z.enum([
  "OBSERVED", // Directly found in code/structure
  "INFERRED", // Detected via pattern matching
  "USER_CONFIRMED", // Explicitly confirmed by user
]);

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

/**
 * Evidence record for an entity or relationship
 */
export const EvidenceRecordSchema = z.object({
  source: EvidenceSourceSchema,
  confidence: z.number().min(0).max(1), // 0 to 1
  details: z.string().optional(),
  discoveredAt: z.number(), // Unix timestamp
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

// =============================================================================
// Entity IDs & Types
// =============================================================================

/**
 * Stable component identity that survives rescans
 */
export const ComponentIdSchema = z.string().regex(/^component-[a-f0-9]{8}$/);
export type ComponentId = z.infer<typeof ComponentIdSchema>;

export function generateComponentId(): ComponentId {
  const id = Math.random().toString(16).slice(2, 10);
  return `component-${id}` as ComponentId;
}

// =============================================================================
// Entity Definitions
// =============================================================================

/**
 * Application - top-level entity representing the entire application
 */
export const ApplicationEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  framework: z.string().optional(),
  packageManager: z.string().optional(),
  buildSystem: z.string().optional(),
  createdAt: z.number(),
  lastIndexedAt: z.number(),
});

export type ApplicationEntity = z.infer<typeof ApplicationEntitySchema>;

/**
 * File - represents a source file in the application
 */
export const FileEntitySchema = z.object({
  id: z.string(),
  path: z.string(),
  type: z.enum(["ts", "tsx", "js", "jsx", "css", "json", "other"]),
  size: z.number(),
  lastModified: z.number(),
  evidence: EvidenceRecordSchema,
});

export type FileEntity = z.infer<typeof FileEntitySchema>;

/**
 * Component - UI component in the application
 */
export const ComponentEntitySchema = z.object({
  id: ComponentIdSchema,
  name: z.string(),
  type: z.enum(["functional", "class", "hook", "page", "layout", "unknown"]),
  filePath: z.string(),
  lineNumber: z.number().optional(),
  selector: z.string().optional(), // data-dyad-id or similar
  evidence: EvidenceRecordSchema,
});

export type ComponentEntity = z.infer<typeof ComponentEntitySchema>;

/**
 * Route - application route/page
 */
export const RouteEntitySchema = z.object({
  id: z.string(),
  path: z.string(),
  pattern: z.string().optional(),
  component: ComponentIdSchema.optional(),
  evidence: EvidenceRecordSchema,
});

export type RouteEntity = z.infer<typeof RouteEntitySchema>;

/**
 * Page - distinct page/screen in the application
 */
export const PageEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string().optional(),
  components: z.array(ComponentIdSchema),
  evidence: EvidenceRecordSchema,
});

export type PageEntity = z.infer<typeof PageEntitySchema>;

/**
 * Feature - logical feature grouping
 */
export const FeatureEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  components: z.array(ComponentIdSchema),
  stateSources: z.array(z.string()),
  serverActions: z.array(z.string()),
  externalServices: z.array(z.string()),
  evidence: EvidenceRecordSchema,
});

export type FeatureEntity = z.infer<typeof FeatureEntitySchema>;

/**
 * StateSource - where application state comes from
 */
export const StateSourceEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["local", "server", "external", "derived", "feltdb"]),
  scope: z.enum(["component", "page", "global"]),
  collectionId: z.string().optional(), // FeltDB collection reference
  evidence: EvidenceRecordSchema,
});

export type StateSourceEntity = z.infer<typeof StateSourceEntitySchema>;

/**
 * Collection - FeltDB collection reference
 */
export const CollectionEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
    })
  ),
  evidence: EvidenceRecordSchema,
});

export type CollectionEntity = z.infer<typeof CollectionEntitySchema>;

/**
 * ServerAction - server-side operation
 */
export const ServerActionEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  filePath: z.string(),
  inputType: z.string().optional(),
  outputType: z.string().optional(),
  mutations: z.array(z.string()).optional(), // Which collections does it mutate?
  evidence: EvidenceRecordSchema,
});

export type ServerActionEntity = z.infer<typeof ServerActionEntitySchema>;

/**
 * ExternalService - external API/service integration
 */
export const ExternalServiceEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    "payment", // Stripe, PayPal
    "auth", // Auth0, Supabase Auth
    "email", // SendGrid, Mailgun
    "storage", // S3, Cloudinary
    "analytics", // Segment, Mixpanel
    "messaging", // Twilio, SendBird
    "other",
  ]),
  importedIn: z.array(z.string()), // File paths where it's imported
  usedBy: z.array(ComponentIdSchema), // Which components use it
  evidence: EvidenceRecordSchema,
});

export type ExternalServiceEntity = z.infer<typeof ExternalServiceEntitySchema>;

/**
 * Dependency - relationship between entities
 */
export const DependencyEntitySchema = z.object({
  id: z.string(),
  source: z.string(), // Entity ID
  target: z.string(), // Entity ID
  type: z.enum([
    "reads",
    "writes",
    "depends_on",
    "renders",
    "imports",
    "calls",
    "mutates",
    "uses",
    "affects",
  ]),
  evidence: EvidenceRecordSchema,
});

export type DependencyEntity = z.infer<typeof DependencyEntitySchema>;

/**
 * Decision - architectural or implementation decision
 */
export const DecisionEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  scope: z.enum(["application", "feature", "component"]),
  decision: z.string(),
  rationale: z.string().optional(),
  source: z.enum(["user", "project", "ai_approved"]),
  status: z.enum(["active", "superseded", "archived"]),
  createdAt: z.number(),
  appliesTo: z.array(z.string()).optional(), // Entity IDs this affects
});

export type DecisionEntity = z.infer<typeof DecisionEntitySchema>;

/**
 * Change - recorded AI or user change to the application
 */
export const ChangeEntitySchema = z.object({
  id: z.string(),
  type: z.enum(["ai", "user", "auto"]),
  request: z.string(),
  description: z.string().optional(),
  affected: z.array(z.string()), // Component/File/Collection IDs
  files: z.array(z.string()), // File paths changed
  createdAt: z.number(),
  status: z.enum(["success", "failed", "rolled_back"]),
  result: z.string().optional(),
  gitSha: z.string().optional(),
  buildPassed: z.boolean().optional(),
  testsPassed: z.boolean().optional(),
});

export type ChangeEntity = z.infer<typeof ChangeEntitySchema>;

/**
 * GitCheckpoint - Git state snapshot for recovery
 */
export const GitCheckpointEntitySchema = z.object({
  id: z.string(),
  commitSha: z.string(),
  branch: z.string(),
  timestamp: z.number(),
  description: z.string().optional(),
  relatedChange: z.string().optional(),
});

export type GitCheckpointEntity = z.infer<typeof GitCheckpointEntitySchema>;

/**
 * Proposal - proposed change to the application
 */
export const ProposalEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  request: z.string(),
  affected: z.array(
    z.object({
      entity: z.string(),
      type: z.string(),
      risk: z.enum(["low", "medium", "high"]),
    })
  ),
  externalServices: z.array(z.string()),
  collectionsMutated: z.array(z.string()),
  estimatedRisk: z.enum(["low", "medium", "high"]),
  createdAt: z.number(),
  status: z.enum(["pending", "approved", "applied", "rejected"]),
});

export type ProposalEntity = z.infer<typeof ProposalEntitySchema>;

// =============================================================================
// Relationship Types
// =============================================================================

export const ApplicationRelationshipSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  source: z.string(), // Entity ID
  target: z.string(), // Entity ID
  type: z.enum([
    "defined_in",
    "rendered_on",
    "reads",
    "reads_from",
    "affected_by",
    "backed_by",
    "used_by",
    "contains",
    "uses",
    "depends_on",
  ]),
  evidence: EvidenceRecordSchema,
});

export type ApplicationRelationship = z.infer<
  typeof ApplicationRelationshipSchema
>;

// =============================================================================
// Query & Context Types
// =============================================================================

/**
 * Bounded context for AI operations
 */
export const ApplicationContextSchema = z.object({
  selected: z.object({
    entity: z.string(),
    type: z.string(),
  }),
  depth0: z.array(z.object({ id: z.string(), type: z.string() })),
  depth1: z.array(z.object({ id: z.string(), type: z.string() })),
  depth2: z.array(z.object({ id: z.string(), type: z.string() })),
  depth3: z.array(z.object({ id: z.string(), type: z.string() })),
  relevantDecisions: z.array(DecisionEntitySchema),
  recentChanges: z.array(ChangeEntitySchema).optional(),
});

export type ApplicationContext = z.infer<typeof ApplicationContextSchema>;

/**
 * Reconciliation status
 */
export const ReconciliationStatusSchema = z.object({
  status: z.enum(["synchronized", "out_of_sync", "reconciling"]),
  lastIndexedAt: z.number(),
  filesChanged: z.number(),
  componentsAdded: z.number(),
  componentsRemoved: z.number(),
});

export type ReconciliationStatus = z.infer<typeof ReconciliationStatusSchema>;
