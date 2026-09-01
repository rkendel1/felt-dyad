import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConversionPlan } from "@/ipc/types";
import {
  AlertTriangle,
  Check,
  Database,
  Info,
  Route,
  Workflow,
} from "lucide-react";
import { SimplificationSummary } from "./SimplificationSummary";

export interface ConversionSummaryProps {
  plan: ConversionPlan;
}

export const ConversionSummary: React.FC<ConversionSummaryProps> = ({
  plan,
}) => {
  const stateSourceCount = plan.stateAnalysis.sources.length;
  const apiRouteCount = plan.backendAnalysis.apiRoutes.length;
  const externalServiceCount = plan.externalServices.length;
  const uiChangeCount = plan.uiChanges.length;
  const warningCount = plan.warnings?.length || 0;
  const manualDecisionCount = plan.manualDecisions?.length || 0;
  const framework =
    plan.applicationAnalysis.buildSystem === "next"
      ? "Next.js"
      : plan.applicationAnalysis.framework || "Unknown framework";
  const database =
    plan.dataAnalysis.database === "NONE"
      ? "No database detected"
      : plan.dataAnalysis.database;
  const databaseServices = plan.externalServices
    .filter((service) => service.type === "DATABASE")
    .map((service) => service.name);
  const moveToFeltDBCount = plan.stateAnalysis.sources.filter((source) =>
    ["MOVE_TO_FELTDB", "REPLACE_WITH_FELTDB"].includes(source.classification),
  ).length;
  const localStateCount = stateSourceCount - moveToFeltDBCount;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{framework} → FeltDB conversion</CardTitle>
          <CardDescription>
            A project-specific plan based on the code, routes, state, and data
            layer detected in this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{stateSourceCount}</div>
              <div className="text-xs text-muted-foreground">
                State sources inspected
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{apiRouteCount}</div>
              <div className="text-xs text-muted-foreground">API routes</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{externalServiceCount}</div>
              <div className="text-xs text-muted-foreground">
                Integrations detected
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{uiChangeCount}</div>
              <div className="text-xs text-muted-foreground">
                Proposed UI changes
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Database className="h-4 w-4" /> What this app uses
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{framework}</Badge>
                <Badge variant="outline">{database}</Badge>
                <Badge variant="outline">
                  {plan.applicationAnalysis.packageManager}
                </Badge>
                {databaseServices.map((service) => (
                  <Badge key={service} variant="secondary">
                    {service}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {apiRouteCount} API {apiRouteCount === 1 ? "route" : "routes"}
                {plan.dataAnalysis.totalTables > 0
                  ? ` and ${plan.dataAnalysis.totalTables} data ${plan.dataAnalysis.totalTables === 1 ? "model" : "models"}`
                  : ""}{" "}
                were found.
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Workflow className="h-4 w-4" /> Recommended conversion
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  Move {moveToFeltDBCount} persistent state{" "}
                  {moveToFeltDBCount === 1 ? "flow" : "flows"} into FeltDB.
                </li>
                <li>
                  Keep {localStateCount} temporary UI state{" "}
                  {localStateCount === 1 ? "flow" : "flows"} local.
                </li>
                <li>
                  Replace {apiRouteCount} detected API{" "}
                  {apiRouteCount === 1 ? "route" : "routes"} where FeltDB can
                  own the state transition.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted p-4 text-sm">
            <Route className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              The detailed analysis maps every recommendation to its source
              file. Acceptance Criteria separates automatic work from items that
              need your decision.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simplification Analysis */}
      {plan.simplification && plan.simplification.complexity.currentLOC > 0 && (
        <SimplificationSummary simplification={plan.simplification} />
      )}

      {/* Warnings */}
      {warningCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-50">
              <AlertTriangle className="h-4 w-4" />
              {warningCount} {warningCount === 1 ? "Warning" : "Warnings"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {plan.warnings?.map((warning, idx) => (
                <li
                  key={idx}
                  className="text-sm text-amber-800 dark:text-amber-100"
                >
                  • {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Manual Decisions Required */}
      {manualDecisionCount > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-50">
              <Info className="h-4 w-4" />
              {manualDecisionCount}{" "}
              {manualDecisionCount === 1 ? "Decision" : "Decisions"} Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.manualDecisions?.map((decision, idx) => (
                <li
                  key={idx}
                  className="text-sm text-blue-900 dark:text-blue-100"
                >
                  <div className="font-medium">{decision.item}</div>
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    {decision.reason}
                  </div>
                  <div className="text-xs italic text-blue-700 dark:text-blue-300">
                    Recommended: {decision.recommendation}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* No warnings/decisions */}
      {warningCount === 0 && manualDecisionCount === 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-50">
              <Check className="h-4 w-4" />
              No issues detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800 dark:text-green-100">
              The analysis found no major warnings or manual decisions needed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
