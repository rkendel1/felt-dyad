/**
 * Simplification Analyzer
 *
 * Calculates estimated complexity reduction and state plumbing removal
 * when converting to FeltDB state-first architecture.
 *
 * This analyzer produces estimates based on static code analysis.
 * Actual results will be measured after conversion.
 */

import type {
  ApplicationAnalysis,
  StateAnalysis,
  BackendAnalysis,
  DataAnalysis,
} from "@/ipc/types/conversion-analysis";
import fs from "node:fs";
import path from "node:path";

export interface ComplexityMetrics {
  currentLOC: number;
  removableLOC: number;
  replaceableLOC: number;
  unchangedLOC: number;
  estimatedReductionPercent: number;
}

export interface ComplexityCategoryRemoval {
  category: string;
  current: number | string;
  estimated: number | string;
  changePercent: number;
  unit: string; // "LOC", "routes", "stores", etc.
}

export interface StatePlumbingFlow {
  description: string;
  steps: string[];
  canBeEliminated: boolean;
  canBeConsolidated: boolean;
}

export interface SimplificationAnalysis {
  locEstimateAvailable: boolean;
  // Overall metrics
  complexity: ComplexityMetrics;

  // Categorized removals
  categoryRemovals: ComplexityCategoryRemoval[];

  // State plumbing flows identified
  statePlumbingFlows: StatePlumbingFlow[];
  flowStats: {
    canBeEliminated: number;
    canBeConsolidated: number;
    shouldRemain: number;
  };

  // Tradeoffs
  newFeltDBCode: number; // Estimated new LOC for FeltDB setup
  newConcepts: string[]; // New application concepts introduced
  netEstimatedReduction: number; // newFeltDBCode - removableLOC

  // Summary
  estimatedAfterLOC: {
    low: number;
    high: number;
  };
}

/**
 * Analyze potential simplification from FeltDB conversion
 */
export async function analyzeSimplification(
  appAnalysis: ApplicationAnalysis,
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  dataAnalysis: DataAnalysis,
  projectPath: string,
): Promise<SimplificationAnalysis> {
  // Estimate current LOC (rough heuristic)
  const currentLOC = estimateLOC(appAnalysis, projectPath);

  // Static analysis can identify affected files and flows, but it cannot know
  // how many lines the approved conversion will remove until that conversion
  // is actually applied. Do not manufacture an LOC projection from route and
  // state-source counts.
  const removableLOC = 0;
  const replaceableLOC = 0;
  const unchangedLOC = currentLOC;
  const estimatedReductionPercent = 0;

  // Calculate category-wise removals
  const categoryRemovals = calculateCategoryRemovals(
    stateAnalysis,
    backendAnalysis,
    dataAnalysis,
  );

  // Identify state plumbing flows
  const statePlumbingFlows = identifyStatePlumbingFlows(
    stateAnalysis,
    backendAnalysis,
  );
  const flowStats = {
    canBeEliminated: statePlumbingFlows.filter((f) => f.canBeEliminated).length,
    canBeConsolidated: statePlumbingFlows.filter((f) => f.canBeConsolidated)
      .length,
    shouldRemain: statePlumbingFlows.filter(
      (f) => !f.canBeEliminated && !f.canBeConsolidated,
    ).length,
  };

  // Calculate tradeoffs
  const newFeltDBCode = 0;
  const hasConversionTargets =
    dataAnalysis.totalTables > 0 ||
    stateAnalysis.sources.some((source) =>
      ["MOVE_TO_FELTDB", "REPLACE_WITH_FELTDB"].includes(source.classification),
    );
  const newConcepts = hasConversionTargets
    ? [
        "FeltDB schema definition",
        "Server-hosted reactive state",
        "State authority and conflict resolution",
      ]
    : [];
  const netEstimatedReduction = 0;

  // Estimate LOC after conversion
  const estimatedAfterLOC = {
    low: currentLOC,
    high: currentLOC,
  };

  return {
    locEstimateAvailable: false,
    complexity: {
      currentLOC,
      removableLOC,
      replaceableLOC,
      unchangedLOC,
      estimatedReductionPercent,
    },
    categoryRemovals,
    statePlumbingFlows,
    flowStats,
    newFeltDBCode,
    newConcepts,
    netEstimatedReduction,
    estimatedAfterLOC,
  };
}

/**
 * Estimate current lines of code based on file count and framework
 */
function estimateLOC(
  _appAnalysis: ApplicationAnalysis,
  projectPath: string,
): number {
  const sourceExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".vue",
    ".svelte",
    ".css",
  ]);
  const ignored = new Set([".git", ".next", "build", "dist", "node_modules"]);
  let lines = 0;
  const queue = [projectPath];

  while (queue.length > 0) {
    const directory = queue.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory() && !ignored.has(entry.name)) queue.push(filePath);
      if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
        try {
          const content = fs.readFileSync(filePath, "utf8");
          lines += content === "" ? 0 : content.split(/\r?\n/).length;
        } catch {
          // Ignore unreadable source files.
        }
      }
    }
  }
  return lines;
}

/**
 * Calculate category-wise complexity removals
 */
function calculateCategoryRemovals(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  _dataAnalysis: DataAnalysis,
): ComplexityCategoryRemoval[] {
  const removals: ComplexityCategoryRemoval[] = [];

  const remainingRoutes = backendAnalysis.apiRoutes.filter(
    (route) => route.classification !== "REPLACE_WITH_FELTDB",
  ).length;
  removals.push({
    category: "API routes",
    current: backendAnalysis.apiRoutes.length,
    estimated: remainingRoutes,
    changePercent: calculateReductionPercent(
      backendAnalysis.apiRoutes.length,
      remainingRoutes,
    ),
    unit: "routes",
  });

  // Client state stores reduction
  const clientStores = stateAnalysis.sources.filter((s) =>
    [
      "REACT_STATE",
      "REACT_CONTEXT",
      "ZUSTAND",
      "REDUX",
      "JOTAI",
      "RECOIL",
      "PINIA",
      "VUEX",
    ].includes(s.type),
  ).length;
  const remainingStores = stateAnalysis.sources.filter(
    (source) =>
      [
        "REACT_STATE",
        "REACT_CONTEXT",
        "ZUSTAND",
        "REDUX",
        "JOTAI",
        "RECOIL",
        "PINIA",
        "VUEX",
      ].includes(source.type) &&
      !["REPLACE_WITH_FELTDB", "MOVE_TO_FELTDB"].includes(
        source.classification,
      ),
  ).length;
  removals.push({
    category: "Client state stores",
    current: clientStores,
    estimated: remainingStores,
    changePercent: calculateReductionPercent(clientStores, remainingStores),
    unit: "stores",
  });

  // Refresh/sync logic reduction
  const syncFlows = stateAnalysis.sources.filter(
    (s) =>
      s.classification === "REPLACE_WITH_FELTDB" ||
      s.classification === "MOVE_TO_FELTDB",
  ).length;
  const remainingSyncFlows = stateAnalysis.sources.filter(
    (source) =>
      !["REPLACE_WITH_FELTDB", "MOVE_TO_FELTDB"].includes(
        source.classification,
      ),
  ).length;
  removals.push({
    category: "Refresh/sync logic",
    current: syncFlows,
    estimated: remainingSyncFlows,
    changePercent: calculateReductionPercent(syncFlows, remainingSyncFlows),
    unit: "flows",
  });

  return removals;
}

function calculateReductionPercent(current: number, remaining: number): number {
  if (current <= 0 || current === remaining) return 0;
  return -Math.round(((current - remaining) / current) * 100);
}

/**
 * Identify state plumbing flows that can be eliminated
 */
function identifyStatePlumbingFlows(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
): StatePlumbingFlow[] {
  const flows: StatePlumbingFlow[] = [];

  // For each API route, create a potential flow to eliminate
  for (const route of backendAnalysis.apiRoutes.slice(0, 10)) {
    // Limit to first 10 for performance
    const flowName = `${route.method} ${route.path}`;

    flows.push({
      description: `State synchronization for ${flowName}`,
      steps: [
        "API request initiated",
        "Loading state set to true",
        "Fetch data from endpoint",
        "Parse response",
        "Update component state",
        "Cache data locally",
        "Invalidate cache on mutation",
        "Refetch on stale data",
        "Error handling & retry",
      ],
      canBeEliminated: route.classification === "REPLACE_WITH_FELTDB",
      canBeConsolidated:
        route.classification === "MOVE_TO_FELTDB" ||
        route.classification === "KEEP_SERVER_SIDE",
    });
  }

  // Add localStorage/IndexedDB flows
  const persistenceFlows = stateAnalysis.sources.filter((s) =>
    ["LOCALSTORAGE", "SESSION_STORAGE", "INDEXED_DB"].includes(s.type),
  );
  for (const flow of persistenceFlows.slice(0, 5)) {
    flows.push({
      description: `Local persistence for ${flow.name}`,
      steps: [
        "Read from storage",
        "Deserialize data",
        "Update state",
        "Monitor changes",
        "Serialize to storage",
        "Handle quota limits",
        "Sync across tabs",
      ],
      canBeEliminated: flow.classification === "MOVE_TO_FELTDB",
      canBeConsolidated: flow.classification !== "MOVE_TO_FELTDB",
    });
  }

  return flows;
}
