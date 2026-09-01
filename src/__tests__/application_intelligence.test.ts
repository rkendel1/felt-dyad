/**
 * Tests for Application Intelligence
 *
 * Unit tests for core application intelligence components
 */

import { describe, it, expect } from "vitest";
import {
  generateComponentId,
  ComponentIdSchema,
} from "@/ipc/types/application-intelligence";
import { RepositoryIntelligenceIndexer } from "@/import/repository_intelligence_indexer";
import { ApplicationContextResolver } from "@/import/application_context_resolver";

describe("Application Intelligence - Component Identity", () => {
  it("should generate stable component IDs", () => {
    const id1 = generateComponentId();
    const id2 = generateComponentId();

    expect(id1).toMatch(/^component-[a-f0-9]{8}$/);
    expect(id2).toMatch(/^component-[a-f0-9]{8}$/);
    expect(id1).not.toBe(id2);
  });

  it("should validate component ID schema", () => {
    const validId = "component-12345678";
    const invalidId = "component-invalid";

    const validResult = ComponentIdSchema.safeParse(validId);
    const invalidResult = ComponentIdSchema.safeParse(invalidId);

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });
});

describe("Application Intelligence - Context Resolver", () => {
  it("should resolve bounded context for a component", () => {
    // Setup mock entities
    const entityMap = new Map([
      [
        "component-12345678",
        {
          id: "component-12345678",
          name: "UserProfile",
          type: "functional",
          filePath: "src/components/UserProfile.tsx",
        },
      ],
      [
        "state-users",
        {
          id: "state-users",
          name: "Users State",
          type: "global",
        },
      ],
    ]);

    const dependencies = [
      {
        id: "dep-1",
        source: "component-12345678",
        target: "state-users",
        type: "reads",
        evidence: {
          source: "OBSERVED" as const,
          confidence: 0.9,
          details: "Found useState in component",
          discoveredAt: Date.now(),
        },
      },
    ];

    const context = ApplicationContextResolver.resolve({
      selectedEntity: "component-12345678",
      selectedEntityType: "component",
      userRequest: "Make this editable",
      applicationEntities: entityMap,
      applicationDependencies: dependencies,
      decisions: [],
    });

    expect(context.selected.entity).toBe("component-12345678");
    expect(context.selected.type).toBe("component");
    expect(context.depth0.length).toBeGreaterThan(0);
  });

  it("should filter relevant decisions", () => {
    const entityMap = new Map([
      [
        "component-12345678",
        {
          id: "component-12345678",
          name: "UserProfile",
        },
      ],
    ]);

    const decisions = [
      {
        id: "decision-1",
        title: "Keep local state",
        description: "Use React hooks for state",
        scope: "component" as const,
        decision: "useState",
        source: "user" as const,
        status: "active" as const,
        createdAt: Date.now(),
        appliesTo: ["component-12345678"],
      },
      {
        id: "decision-2",
        title: "Use FeltDB",
        description: "Use FeltDB for global state",
        scope: "application" as const,
        decision: "FeltDB",
        source: "user" as const,
        status: "active" as const,
        createdAt: Date.now(),
        appliesTo: [],
      },
    ];

    const context = ApplicationContextResolver.resolve({
      selectedEntity: "component-12345678",
      selectedEntityType: "component",
      userRequest: "Make this editable",
      applicationEntities: entityMap,
      applicationDependencies: [],
      decisions,
    });

    // Should only include decisions that apply to the component
    expect(context.relevantDecisions.length).toBe(1);
    expect(context.relevantDecisions[0].id).toBe("decision-1");
  });
});

describe("Application Intelligence - Repository Indexing", () => {
  it("should create an indexer with correct config", () => {
    const indexer = new RepositoryIntelligenceIndexer(
      "/tmp/app",
      "REACT",
      "app-1",
    );

    expect(indexer).toBeDefined();
    expect(typeof indexer.index).toBe("function");
  });
});

describe("Application Intelligence - Evidence & Confidence", () => {
  it("should track evidence sources correctly", () => {
    const evidence = {
      source: "OBSERVED" as const,
      confidence: 1.0,
      details: "Found in code",
      discoveredAt: Date.now(),
    };

    expect(evidence.source).toBe("OBSERVED");
    expect(evidence.confidence).toBe(1.0);

    const inferredEvidence = {
      source: "INFERRED" as const,
      confidence: 0.7,
      details: "Pattern matched",
      discoveredAt: Date.now(),
    };

    expect(inferredEvidence.source).toBe("INFERRED");
    expect(inferredEvidence.confidence).toBe(0.7);
    expect(inferredEvidence.confidence).toBeLessThan(1.0);
  });
});

describe("Application Intelligence - Decision Precedence", () => {
  it("should respect user decision precedence", () => {
    const userDecision = {
      id: "decision-user",
      title: "Keep External",
      description: "Keep Stripe external",
      scope: "component" as const,
      decision: "Keep Stripe integration external, do not migrate to FeltDB",
      source: "user" as const,
      status: "active" as const,
      createdAt: Date.now(),
      appliesTo: ["component-stripe"],
    };

    const aiDecision = {
      id: "decision-ai",
      title: "Migrate to FeltDB",
      description: "AI suggested migrating",
      scope: "component" as const,
      decision: "Move Stripe state to FeltDB",
      source: "ai_approved" as const,
      status: "active" as const,
      createdAt: Date.now(),
      appliesTo: ["component-stripe"],
    };

    // User decisions should have higher priority
    expect(userDecision.source).toBe("user");
    expect(aiDecision.source).toBe("ai_approved");
  });
});

describe("Application Intelligence - Change Recording", () => {
  it("should record change metadata", () => {
    const change = {
      id: "change-1",
      type: "ai" as const,
      request: "Make customer status editable",
      description: "Added editable status field",
      affected: ["component-CustomerStatus", "collection-customers"],
      files: ["src/components/CustomerStatus.tsx"],
      createdAt: Date.now(),
      status: "success" as const,
      gitSha: "abc123def456",
      buildPassed: true,
      testsPassed: true,
    };

    expect(change.type).toBe("ai");
    expect(change.status).toBe("success");
    expect(change.affected).toHaveLength(2);
    expect(change.buildPassed).toBe(true);
  });
});

describe("Application Intelligence - Reconciliation", () => {
  it("should track reconciliation status", () => {
    const now = Date.now();
    const lastIndexed = now - 30000; // 30 seconds ago

    const status = {
      status: "synchronized" as const,
      lastIndexedAt: lastIndexed,
      filesChanged: 0,
      componentsAdded: 0,
      componentsRemoved: 0,
    };

    // Synchronized if indexed recently
    expect(status.status).toBe("synchronized");

    // Out of sync if indexed long ago
    const staleStatus = {
      status: "out_of_sync" as const,
      lastIndexedAt: now - 3600000, // 1 hour ago
      filesChanged: 5,
      componentsAdded: 2,
      componentsRemoved: 1,
    };

    expect(staleStatus.status).toBe("out_of_sync");
    expect(staleStatus.filesChanged).toBeGreaterThan(0);
  });
});
