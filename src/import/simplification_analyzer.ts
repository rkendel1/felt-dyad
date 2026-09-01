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

  // Calculate complexity metrics
  const removableLOC = Math.min(
    estimateRemovableLOC(stateAnalysis, backendAnalysis, dataAnalysis),
    currentLOC,
  );
  const replaceableLOC = Math.min(
    estimateReplaceableLOC(stateAnalysis, backendAnalysis),
    Math.max(currentLOC - removableLOC, 0),
  );
  const unchangedLOC = Math.max(currentLOC - removableLOC - replaceableLOC, 0);
  const estimatedReductionPercent =
    currentLOC > 0
      ? (Math.min(removableLOC + replaceableLOC, currentLOC) / currentLOC) * 100
      : 0;

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
  const newFeltDBCode = estimateNewFeltDBCode(dataAnalysis, stateAnalysis);
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
  const netEstimatedReduction = removableLOC + replaceableLOC - newFeltDBCode;

  // Estimate LOC after conversion
  const estimatedLow =
    currentLOC > 0
      ? Math.max(currentLOC - removableLOC - replaceableLOC, 1)
      : 0;
  const estimatedAfterLOC = {
    low: estimatedLow,
    high: Math.max(
      currentLOC - (removableLOC + replaceableLOC) * 0.7,
      estimatedLow,
    ),
  };

  return {
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
 * Estimate removable LOC (API client code, database access, state sync)
 */
function estimateRemovableLOC(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  _dataAnalysis: DataAnalysis,
): number {
  let removable = 0;

  // API client code (estimated 100 LOC per route)
  removable += backendAnalysis.apiRoutes.length * 100;

  // Database access code (estimated 50 LOC per API route)
  removable += backendAnalysis.apiRoutes.length * 50;

  // State sync and refresh logic (estimated 200 LOC per state source)
  removable +=
    stateAnalysis.sources.filter(
      (s) => s.classification === "REPLACE_WITH_FELTDB",
    ).length * 200;

  // Loading/error state handling (estimated 80 LOC per state source)
  removable +=
    stateAnalysis.sources.filter(
      (s) =>
        s.classification === "REPLACE_WITH_FELTDB" ||
        s.classification === "MOVE_TO_FELTDB",
    ).length * 80;

  return Math.min(removable, 10000); // Cap at reasonable limit
}

/**
 * Estimate replaceable LOC (code that will be replaced by FeltDB primitives)
 */
function estimateReplaceableLOC(
  stateAnalysis: StateAnalysis,
  _backendAnalysis: BackendAnalysis,
): number {
  let replaceable = 0;

  // React state management (estimated 60 LOC per store)
  replaceable +=
    stateAnalysis.sources.filter((s) => s.type === "REACT_STATE").length * 60;

  // Context providers (estimated 120 LOC per context)
  replaceable +=
    stateAnalysis.sources.filter((s) => s.type === "REACT_CONTEXT").length *
    120;

  // External state management (Zustand, Redux, etc.)
  const stateStores = stateAnalysis.sources.filter((s) =>
    ["ZUSTAND", "REDUX", "JOTAI", "RECOIL", "PINIA", "VUEX"].includes(s.type),
  );
  replaceable += stateStores.length * 150;

  return Math.min(replaceable, 5000);
}

/**
 * Calculate category-wise complexity removals
 */
function calculateCategoryRemovals(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  dataAnalysis: DataAnalysis,
): ComplexityCategoryRemoval[] {
  const removals: ComplexityCategoryRemoval[] = [];

  // API routes reduction
  const apiRouteReduction = Math.round(backendAnalysis.apiRoutes.length * 0.55);
  removals.push({
    category: "API routes",
    current: backendAnalysis.apiRoutes.length,
    estimated: Math.max(
      backendAnalysis.apiRoutes.length - apiRouteReduction,
      0,
    ),
    changePercent: backendAnalysis.apiRoutes.length > 0 ? -55 : 0,
    unit: "routes",
  });

  // API client code reduction
  const apiClientLOC = backendAnalysis.apiRoutes.length * 120;
  const apiClientReduction = Math.round(apiClientLOC * 0.55);
  removals.push({
    category: "API client code",
    current: apiClientLOC,
    estimated: Math.max(apiClientLOC - apiClientReduction, 0),
    changePercent: apiClientLOC > 0 ? -55 : 0,
    unit: "LOC",
  });

  // Database access code reduction
  const dbAccessLOC =
    backendAnalysis.apiRoutes.length * 80 + dataAnalysis.totalTables * 100;
  const dbAccessReduction = Math.round(dbAccessLOC * 0.59);
  removals.push({
    category: "Database access code",
    current: dbAccessLOC,
    estimated: Math.max(dbAccessLOC - dbAccessReduction, 0),
    changePercent: dbAccessLOC > 0 ? -59 : 0,
    unit: "LOC",
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
  const storesReduction = Math.round(clientStores * 0.56);
  removals.push({
    category: "Client state stores",
    current: clientStores,
    estimated: Math.max(clientStores - storesReduction, 0),
    changePercent: clientStores > 0 ? -56 : 0,
    unit: "stores",
  });

  // Loading states reduction (estimate 2-3 per API route)
  const loadingStates = backendAnalysis.apiRoutes.length * 2.5;
  const loadingReduction = Math.round(loadingStates * 0.55);
  removals.push({
    category: "Loading states",
    current: Math.round(loadingStates),
    estimated: Math.max(Math.round(loadingStates - loadingReduction), 0),
    changePercent: loadingStates > 0 ? -55 : 0,
    unit: "states",
  });

  // Refresh/sync logic reduction
  const syncFlows = stateAnalysis.sources.filter(
    (s) =>
      s.classification === "REPLACE_WITH_FELTDB" ||
      s.classification === "MOVE_TO_FELTDB",
  ).length;
  const syncReduction = Math.round(syncFlows * 0.75);
  removals.push({
    category: "Refresh/sync logic",
    current: syncFlows,
    estimated: Math.max(syncFlows - syncReduction, 0),
    changePercent: syncFlows > 0 ? -75 : 0,
    unit: "flows",
  });

  // Database migrations reduction
  const migrationCount = dataAnalysis.totalTables;
  const migrationReduction = Math.round(migrationCount * 0.75);
  removals.push({
    category: "Database migrations",
    current: migrationCount,
    estimated: Math.max(migrationCount - migrationReduction, 0),
    changePercent: migrationCount > 0 ? -75 : 0,
    unit: "files",
  });

  return removals;
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

/**
 * Estimate new FeltDB-related code
 */
function estimateNewFeltDBCode(
  dataAnalysis: DataAnalysis,
  stateAnalysis: StateAnalysis,
): number {
  // Schema definition (estimated 50-80 LOC per collection)
  const stateCollections = stateAnalysis.sources.filter((source) =>
    ["MOVE_TO_FELTDB", "REPLACE_WITH_FELTDB"].includes(source.classification),
  ).length;
  const collections = Math.max(dataAnalysis.totalTables, stateCollections);
  if (collections === 0) return 0;
  const schemaLOC = collections * 65;

  // Query/mutation hooks (estimated 30 LOC per collection)
  const hooksLOC = collections * 30;

  // Sync configuration (estimated 100-200 LOC)
  const syncLOC = 40;

  // Total new code
  return Math.min(schemaLOC + hooksLOC + syncLOC, 2500);
}
