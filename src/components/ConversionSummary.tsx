import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionPlan } from "@/ipc/types";
import { AlertTriangle, Check, Info } from "lucide-react";
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

  return (
    <div className="space-y-4">
      {/* Main Summary */}
      <Card>
        <CardHeader>
          <CardTitle>State-First Conversion Analysis</CardTitle>
          <CardDescription>
            Analysis of {plan.applicationAnalysis.framework || "unknown"} application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{plan.summary}</p>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{stateSourceCount}</div>
              <div className="text-xs text-muted-foreground">State sources found</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{apiRouteCount}</div>
              <div className="text-xs text-muted-foreground">API routes</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{externalServiceCount}</div>
              <div className="text-xs text-muted-foreground">External services</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{uiChangeCount}</div>
              <div className="text-xs text-muted-foreground">UI changes needed</div>
            </div>
          </div>

          {/* Framework & Build Info */}
          <div className="grid gap-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Framework:</span>
              <Badge>{plan.applicationAnalysis.framework || "Unknown"}</Badge>
            </div>
            {plan.applicationAnalysis.buildSystem && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Build system:</span>
                <Badge variant="outline">{plan.applicationAnalysis.buildSystem}</Badge>
              </div>
            )}
            {plan.applicationAnalysis.packageManager && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Package manager:</span>
                <Badge variant="outline">{plan.applicationAnalysis.packageManager}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Simplification Analysis */}
      {plan.simplification && (
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
                <li key={idx} className="text-sm text-amber-800 dark:text-amber-100">
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
              {manualDecisionCount} {manualDecisionCount === 1 ? "Decision" : "Decisions"} Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.manualDecisions?.map((decision, idx) => (
                <li key={idx} className="text-sm text-blue-900 dark:text-blue-100">
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
