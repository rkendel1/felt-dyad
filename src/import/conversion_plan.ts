import {
  ConversionPlan,
  ApplicationAnalysis,
  StateAnalysis,
  BackendAnalysis,
  DataAnalysis,
  ExternalService,
  UiChange,
} from "@/ipc/types/conversion-analysis";

export function generateConversionPlan(
  appId: number,
  applicationAnalysis: ApplicationAnalysis,
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
  dataAnalysis: DataAnalysis,
  externalServices: ExternalService[],
): ConversionPlan {
  const uiChanges = generateUiChanges(stateAnalysis, backendAnalysis);
  const summary = generateSummary(
    applicationAnalysis,
    stateAnalysis,
    backendAnalysis,
    dataAnalysis,
    externalServices,
    uiChanges,
  );
  const warnings = generateWarnings(dataAnalysis, externalServices);
  const manualDecisions = generateManualDecisions(
    stateAnalysis,
    backendAnalysis,
    externalServices,
  );

  return {
    appId,
    status: "PENDING_APPROVAL",
    applicationAnalysis,
    stateAnalysis,
    backendAnalysis,
    dataAnalysis,
    externalServices,
    uiChanges,
    summary,
    warnings,
    manualDecisions,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function generateUiChanges(
  stateAnalysis: StateAnalysis,
  backendAnalysis: BackendAnalysis,
): UiChange[] {
  const changes: UiChange[] = [];

  // Find components that use API responses
  const apiUsingComponents = stateAnalysis.sources.filter(
    (s) => s.type === "API_RESPONSE",
  );

  for (const component of apiUsingComponents) {
    changes.push({
      component: component.name,
      file: component.file || "",
      currentPattern: "fetch + useState + useEffect",
      proposedPattern: "FeltDB reactive query",
      impact: "Remove manual fetch lifecycle, connect to FeltDB state",
    });
  }

  // Find components with manual refresh buttons
  if (apiUsingComponents.length > 0) {
    changes.push({
      component: "Generic components with refresh buttons",
      file: "",
      currentPattern: "Manual refresh button for re-fetching data",
      proposedPattern: "Automatic reactivity via FeltDB",
      impact: "Remove refresh button, UI reacts automatically to state changes",
      isManual: true,
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
): string {
  const externalCount = externalServices.filter(
    (s) => s.classification === "KEEP_EXTERNAL",
  ).length;
  const uiChangeCount = uiChanges.length;
  const apiRouteCount = backendAnalysis.apiRoutes.length;

  return `I analyzed your ${applicationAnalysis.framework} application and created a FeltDB conversion plan.

Your app currently stores state across:
- ${stateAnalysis.sources.map((s) => s.type).join(", ")}

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
