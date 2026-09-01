/**
 * Application Context Resolver
 *
 * Takes a selected component/entity and user request, and resolves
 * the relevant application context needed for AI operations.
 *
 * Uses depth-based boundaries to keep token usage manageable:
 * - Depth 0: Selected component
 * - Depth 1: Parent, state, file, feature
 * - Depth 2: Collection, mutation, related components, external services
 * - Depth 3: Relevant history
 */

import {
  ApplicationContext,
  DecisionEntity,
  ChangeEntity,
} from "@/ipc/types/application-intelligence";

export interface ContextResolverInput {
  selectedEntity: string; // Entity ID (usually a component)
  selectedEntityType: string; // Type of entity
  userRequest: string;
  applicationEntities: Map<string, any>;
  applicationDependencies: DependencyEntity[];
  decisions: DecisionEntity[];
  recentChanges?: ChangeEntity[];
}

export class ApplicationContextResolver {
  /**
   * Resolve bounded context for AI operations
   */
  static resolve(input: ContextResolverInput): ApplicationContext {
    const depth0: any[] = [];
    const depth1: any[] = [];
    const depth2: any[] = [];
    const depth3: any[] = [];

    // Depth 0: Selected entity
    const selectedEntity = input.applicationEntities.get(input.selectedEntity);
    if (selectedEntity) {
      depth0.push({
        id: input.selectedEntity,
        type: input.selectedEntityType,
        entity: selectedEntity,
      });
    }

    // Depth 1: Related entities (parent, state, file, feature)
    const depth1Ids = this.findDepth1(
      input.selectedEntity,
      input.applicationDependencies,
    );
    for (const id of depth1Ids) {
      const entity = input.applicationEntities.get(id);
      if (entity) {
        depth1.push({
          id,
          type: this.getEntityType(id),
          entity,
        });
      }
    }

    // Depth 2: Related components, collections, mutations, services
    const depth2Ids = this.findDepth2(
      [...depth1Ids],
      input.applicationDependencies,
    );
    for (const id of depth2Ids) {
      const entity = input.applicationEntities.get(id);
      if (entity) {
        depth2.push({
          id,
          type: this.getEntityType(id),
          entity,
        });
      }
    }

    // Depth 3: Relevant history
    const depth3Ids = this.findDepth3(
      [...depth2Ids],
      input.applicationDependencies,
    );
    for (const id of depth3Ids) {
      const entity = input.applicationEntities.get(id);
      if (entity) {
        depth3.push({
          id,
          type: this.getEntityType(id),
          entity,
        });
      }
    }

    // Filter decisions by relevance
    const relevantDecisions = this.filterRelevantDecisions(input.decisions, [
      input.selectedEntity,
      ...depth1Ids,
      ...depth2Ids,
      ...depth3Ids,
    ]);

    return {
      selected: {
        entity: input.selectedEntity,
        type: input.selectedEntityType,
      },
      depth0,
      depth1,
      depth2,
      depth3,
      relevantDecisions,
      recentChanges: input.recentChanges?.slice(0, 3),
    };
  }

  /**
   * Find depth 1 entities: direct connections
   */
  private static findDepth1(
    entityId: string,
    dependencies: DependencyEntity[],
  ): string[] {
    const ids = new Set<string>();

    for (const dep of dependencies) {
      if (dep.source === entityId) {
        ids.add(dep.target);
      } else if (dep.target === entityId) {
        ids.add(dep.source);
      }
    }

    return Array.from(ids);
  }

  /**
   * Find depth 2 entities: connections of depth 1 entities
   */
  private static findDepth2(
    depth1Ids: string[],
    dependencies: DependencyEntity[],
  ): string[] {
    const ids = new Set<string>();

    for (const entityId of depth1Ids) {
      for (const dep of dependencies) {
        if (dep.source === entityId) {
          ids.add(dep.target);
        } else if (dep.target === entityId) {
          ids.add(dep.source);
        }
      }
    }

    return Array.from(ids);
  }

  /**
   * Find depth 3 entities: connections of depth 2 entities
   */
  private static findDepth3(
    depth2Ids: string[],
    dependencies: DependencyEntity[],
  ): string[] {
    const ids = new Set<string>();

    for (const entityId of depth2Ids) {
      for (const dep of dependencies) {
        if (dep.source === entityId) {
          ids.add(dep.target);
        } else if (dep.target === entityId) {
          ids.add(dep.source);
        }
      }
    }

    return Array.from(ids);
  }

  /**
   * Filter decisions that are relevant to the given entities
   */
  private static filterRelevantDecisions(
    decisions: DecisionEntity[],
    entityIds: string[],
  ): DecisionEntity[] {
    return decisions.filter((decision) => {
      if (!decision.appliesTo || decision.appliesTo.length === 0) {
        return false; // Only include decisions that explicitly apply to entities
      }

      return decision.appliesTo.some((id: string) => entityIds.includes(id));
    });
  }

  /**
   * Get entity type from ID prefix
   */
  private static getEntityType(id: string): string {
    if (id.startsWith("component-")) return "component";
    if (id.startsWith("route-")) return "route";
    if (id.startsWith("page-")) return "page";
    if (id.startsWith("feature-")) return "feature";
    if (id.startsWith("state-")) return "state";
    if (id.startsWith("collection-")) return "collection";
    if (id.startsWith("action-")) return "server-action";
    if (id.startsWith("service-")) return "external-service";
    if (id.startsWith("file-")) return "file";
    return "unknown";
  }
}

/**
 * Generate application-aware AI prompt from context
 */
export function generateAIPrompt(
  userRequest: string,
  context: ApplicationContext,
): string {
  const prompt: string[] = [
    "APPLICATION CONTEXT",
    "─────────────────────────────────────────",
    "",
  ];

  if (context.depth0.length > 0) {
    prompt.push("SELECTED ENTITY:");
    for (const item of context.depth0) {
      prompt.push(`  ${item.type}: ${item.entity.name || item.id}`);
      if (item.entity.filePath) {
        prompt.push(`  File: ${item.entity.filePath}`);
      }
      if (item.entity.type) {
        prompt.push(`  Type: ${item.entity.type}`);
      }
    }
    prompt.push("");
  }

  if (context.depth1.length > 0) {
    prompt.push("RELATED ENTITIES (Depth 1):");
    for (const item of context.depth1) {
      prompt.push(`  - ${item.type}: ${item.entity.name || item.id}`);
    }
    prompt.push("");
  }

  if (context.depth2.length > 0) {
    prompt.push("DATA & SERVICES (Depth 2):");
    for (const item of context.depth2) {
      if (
        item.type === "collection" ||
        item.type === "server-action" ||
        item.type === "external-service"
      ) {
        prompt.push(`  - ${item.type}: ${item.entity.name || item.id}`);
      }
    }
    prompt.push("");
  }

  if (context.relevantDecisions.length > 0) {
    prompt.push("RELEVANT DECISIONS:");
    for (const decision of context.relevantDecisions) {
      prompt.push(`  - ${decision.title}: ${decision.decision}`);
      if (decision.rationale) {
        prompt.push(`    Rationale: ${decision.rationale}`);
      }
    }
    prompt.push("");
  }

  if (context.recentChanges && context.recentChanges.length > 0) {
    prompt.push("RECENT CHANGES:");
    for (const change of context.recentChanges) {
      prompt.push(
        `  - ${change.request} (${new Date(change.createdAt).toLocaleDateString()})`,
      );
    }
    prompt.push("");
  }

  prompt.push("USER REQUEST:");
  prompt.push(`"${userRequest}"`);
  prompt.push("");

  return prompt.join("\n");
}
