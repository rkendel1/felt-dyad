import {
  ConversionPlan,
  ApplicationAnalysis,
  StateAnalysis,
  BackendAnalysis,
  DataAnalysis,
  ExternalService,
  UiChange,
  SimplificationAnalysis,
} from "@/ipc/types/conversion-analysis";

export function generateConversionPlan(
  appId: number,
  applicationAnalysis: ApplicationAnalysis,
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  dataAnalysis: DataAnalysis,
  externalServices: ExternalService[],
  simplificationAnalysis: SimplificationAnalysis,
): ConversionPlan {
  const uiChanges = generateUiChanges(stateAnalysis);
  const summary = generateSummary(
    applicationAnalysis,
    stateAnalysis,
    backendAnalysis,
    dataAnalysis,
    externalServices,
    uiChanges,
    simplificationAnalysis,
  );
  const warnings = generateWarnings(dataAnalysis, externalServices);
  const manualDecisions = generateManualDecisions(
    stateAnalysis,
    backendAnalysis,
    externalServices,
  );

  return {
    analysisVersion: 2,
    appId,
    status: "PENDING_APPROVAL",
    applicationAnalysis,
    stateAnalysis,
    backendAnalysis,
    dataAnalysis,
    externalServices,
    uiChanges,
    simplification: simplificationAnalysis,
    summary,
    warnings,
    manualDecisions,
    targetRuntime: {
      provider: "feltdb",
      runtime: "server",
      mode: "local",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generateUiChanges(stateAnalysis: StateAnalysis): UiChange[] {
  const changes: UiChange[] = [];

  // Find components that use API responses
  const apiUsingComponents = stateAnalysis.sources.filter(
    (source) => source.type === "API_RESPONSE",
  );

  for (const component of apiUsingComponents) {
    changes.push({
      component: component.name,
      file: component.file || "",
      currentPattern: "fetch + useState + useEffect",
      proposedPattern: "FeltDB reactive query",
      impact:
        component.classification === "REPLACE_WITH_FELTDB"
          ? "Remove manual fetch lifecycle, connect to FeltDB state"
          : "Review whether this request represents durable FeltDB state",
      isManual: component.classification !== "REPLACE_WITH_FELTDB",
    });
  }

  // Find context/store usage
  const storeComponents = stateAnalysis.sources.filter((s) =>
    ["REDUX", "ZUSTAND", "RECOIL", "JOTAI", "REACT_CONTEXT"].includes(s.type),
  );

  for (const store of storeComponents) {
    changes.push({
      component: store.name,
      file: store.file || "",
      currentPattern: `${store.type} provider/hook`,
      proposedPattern: "FeltDB collection subscription",
      impact: "Replace store with FeltDB reactive subscription",
      isManual: store.classification !== "REPLACE_WITH_FELTDB",
    });
  }

  return changes;
}

function generateSummary(
  applicationAnalysis: ApplicationAnalysis,
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  dataAnalysis: DataAnalysis,
  externalServices: ExternalService[],
  uiChanges: UiChange[],
  simplificationAnalysis: SimplificationAnalysis,
): string {
  const externalCount = externalServices.filter(
    (s) => s.classification === "KEEP_EXTERNAL",
  ).length;
  const uiChangeCount = uiChanges.length;
  const apiRouteCount = backendAnalysis.apiRoutes.length;
  const flowsEliminated = simplificationAnalysis.flowStats.canBeEliminated;

  // Detect existing database providers
  const databaseServices = externalServices.filter(
    (s) => s.type === "DATABASE",
  );
  const sourceProvider =
    databaseServices.length > 0
      ? databaseServices.map((s) => s.name).join(" + ")
      : "multiple state sources";

  return `I analyzed your ${applicationAnalysis.framework} application and created a FeltDB conversion plan.

Your app currently stores state across:
- ${stateAnalysis.sources.map((s) => s.type).join(", ")}
${databaseServices.length > 0 ? `\nDetected database provider: ${sourceProvider}` : ""}

I found ${stateAnalysis.sources.length} state flows that can move to FeltDB.

I also identified ${externalCount} services that should remain external:
${externalServices
  .filter((s) => s.classification === "KEEP_EXTERNAL")
  .map((s) => `- ${s.name} (${s.type})`)
  .join("\n")}

Converting to FeltDB will require:
- ${uiChangeCount} UI changes
- ${apiRouteCount} API route transformations
- ${dataAnalysis.totalTables} database table migrations
${backendAnalysis.serverActions.length > 0 ? `- ${backendAnalysis.serverActions.length} server action updates` : ""}

Detected simplification scope:
- State plumbing flows that can be eliminated: ${flowsEliminated}
- LOC reduction will be measured after the approved conversion is applied

Your application will be converted to use FeltDB as the primary state and database runtime.

Nothing has been changed yet. Review the conversion plan to see exactly what will change.`;
}

function generateWarnings(
  dataAnalysis: DataAnalysis,
  externalServices: ExternalService[],
): string[] {
  const warnings: string[] = [];

  if (dataAnalysis.excludedFields && dataAnalysis.excludedFields.length > 0) {
    warnings.push(
      `⚠ ${dataAnalysis.excludedFields.length} sensitive fields will be excluded from FeltDB (passwords, API keys, secrets)`,
    );
  }

  if (dataAnalysis.totalTables > 10) {
    warnings.push(
      `⚠ Large number of database tables (${dataAnalysis.totalTables}). Migration complexity may be high.`,
    );
  }

  const authServices = externalServices.filter(
    (s) => s.type === "AUTHENTICATION",
  );
  if (authServices.length > 0) {
    warnings.push(
      `⚠ Authentication must remain external. User credentials will not be moved to FeltDB.`,
    );
  }

  const paymentServices = externalServices.filter((s) => s.type === "PAYMENTS");
  if (paymentServices.length > 0) {
    warnings.push(
      `⚠ Payment processing must be kept in backend. Stripe/payment state stays server-side.`,
    );
  }

  return warnings;
}

function generateManualDecisions(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  externalServices: ExternalService[],
) {
  const decisions: Array<{
    item: string;
    reason: string;
    recommendation: string;
  }> = [];

  // Check for complex reducers
  const reducerState = stateAnalysis.sources.filter(
    (s) => s.type === "REACT_STATE" && s.name.includes("useReducer"),
  );
  if (reducerState.length > 0) {
    decisions.push({
      item: "Complex state with useReducer",
      reason:
        "useReducer implies complex state logic that may need to be reimplemented as server actions",
      recommendation:
        "Review each useReducer and decide if logic should move to FeltDB mutations or server actions",
    });
  }

  // Check for localStorage transformations
  const localStorageState = stateAnalysis.sources.filter(
    (s) => s.type === "LOCALSTORAGE",
  );
  if (localStorageState.length > 0) {
    decisions.push({
      item: `localStorage usage (${localStorageState.length} instances)`,
      reason:
        "Some localStorage may be user preferences that should sync across devices",
      recommendation:
        "Review each localStorage use case. Preferences → FeltDB, temporary data → local state",
    });
  }

  const otherStateReviews = stateAnalysis.sources.filter(
    (source) =>
      source.classification === "REVIEW" &&
      source.type !== "LOCALSTORAGE" &&
      !source.name.includes("useReducer"),
  );
  if (otherStateReviews.length > 0) {
    decisions.push({
      item: `State candidates requiring review (${otherStateReviews.length})`,
      reason:
        "Static syntax detection cannot determine whether these values are durable application state or temporary implementation details.",
      recommendation:
        "Review the named source files and classify each candidate before conversion.",
    });
  }

  const routeReviews = backendAnalysis.apiRoutes.filter(
    (route) => route.classification === "REVIEW",
  );
  if (routeReviews.length > 0) {
    decisions.push({
      item: `Server routes requiring review (${routeReviews.length})`,
      reason:
        "A detected route is not automatically replaceable; redirects, assets, authentication, and external integrations may need to remain server-side.",
      recommendation:
        "Review each route implementation and approve only routes whose state transition FeltDB can own.",
    });
  }

  // Check for authentication concerns
  const authServices = externalServices.filter(
    (s) => s.type === "AUTHENTICATION",
  );
  if (authServices.length > 0) {
    decisions.push({
      item: "User authentication and authorization",
      reason:
        "FeltDB does not manage credentials or authentication. These remain in your external auth system.",
      recommendation:
        "Use NextAuth/Supabase Auth for identity. FeltDB owns application data access control.",
    });
  }

  // Check for webhook handling
  const webhookServices = externalServices.filter(
    (s) => s.type === "WEBHOOKS" || s.type === "API",
  );
  if (webhookServices.length > 0) {
    decisions.push({
      item: "External webhook handlers",
      reason: "Webhooks that update application state need special handling",
      recommendation: "Webhook → Server action → FeltDB mutation pattern",
    });
  }

  return decisions;
}
