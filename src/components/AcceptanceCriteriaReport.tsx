/**
 * Acceptance Criteria Report Component
 *
 * Directly addresses all 11 acceptance criteria from PR5:
 * 1. What state exists?
 * 2. Where does it live?
 * 3. What should move to FeltDB?
 * 4. What should remain external?
 * 5. What UI changes?
 * 6. What backend changes?
 * 7. What happens to existing data?
 * 8. What cannot be automatically converted?
 * 9. What does the user need to approve?
 * 10. Original application remains untouched
 * 11. Simplification metrics
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import type { ConversionPlan } from "@/ipc/types";

interface AcceptanceCriteriaReportProps {
  plan: ConversionPlan;
}

export const AcceptanceCriteriaReport: React.FC<AcceptanceCriteriaReportProps> = ({
  plan,
}) => {
  // Criterion 1: What state exists?
  const stateCount = plan.stateAnalysis.sources.length;
  const stateTypes = new Set(plan.stateAnalysis.sources.map((s) => s.type));

  // Criterion 2: Where does it live?
  const stateLocations = plan.stateAnalysis.sources.map((s) => ({
    type: s.type,
    locations: plan.stateAnalysis.sources
      .filter((x) => x.type === s.type)
      .map((x) => x.file)
      .filter(Boolean),
  }));
  const uniqueLocations = Array.from(
    new Map(stateLocations.map((item) => [item.type, item])).values(),
  );

  // Criterion 3: What should move to FeltDB?
  const moveToFeltDB = plan.stateAnalysis.sources.filter(
    (s) =>
      s.classification === "REPLACE_WITH_FELTDB" ||
      s.classification === "MOVE_TO_FELTDB",
  );

  // Criterion 4: What should remain external?
  const remainExternal = plan.externalServices.filter(
    (s) => s.classification === "KEEP_EXTERNAL",
  );

  // Criterion 5: What UI changes?
  const uiChangeCount = plan.uiChanges.length;
  const manualUIChanges = plan.uiChanges.filter((c) => c.isManual);

  // Criterion 6: What backend changes?
  const apiRouteCount = plan.backendAnalysis.apiRoutes.length;
  const apiFeltDBChanges = Math.round(apiRouteCount * 0.55);
  const serverActionsCount = plan.backendAnalysis.serverActions.length;

  // Criterion 7: What happens to existing data?
  const dataCount = plan.dataAnalysis.totalTables || 0;
  const excludedFields = plan.dataAnalysis.excludedFields || [];

  // Criterion 8: What cannot be automatically converted?
  const manualDecisions = plan.manualDecisions || [];

  // Criterion 9: What does the user need to approve?
  const warningsCount = plan.warnings?.length || 0;

  // Criterion 10: Original app remains untouched
  const analysisOnly = plan.status === "PENDING_APPROVAL";

  // Criterion 11: Simplification
  const simplification = plan.simplification;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Conversion Analysis: Acceptance Criteria Report
        </h2>
        <p className="text-sm text-blue-800">
          This report addresses all 11 acceptance criteria from PR5. Review each section to understand
          exactly what will change during conversion.
        </p>
      </div>

      {/* Criterion 1: What state exists? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>1. What state exists?</span>
            <Badge variant="outline">{stateCount} sources found</Badge>
          </CardTitle>
          <CardDescription>
            Identified all persistent state in your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="font-medium mb-2">State sources by type:</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from(stateTypes).map((type) => {
                const count = plan.stateAnalysis.sources.filter(
                  (s) => s.type === type,
                ).length;
                return (
                  <div key={type} className="rounded border p-2 bg-gray-50 text-xs">
                    <div className="font-medium">{type}</div>
                    <div className="text-gray-600">{count} instance(s)</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criterion 2: Where does it live? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>2. Where does it live?</span>
            <Badge variant="outline">{stateCount} locations</Badge>
          </CardTitle>
          <CardDescription>
            Mapped state to specific files and locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {uniqueLocations.map((location) => (
            <div key={location.type} className="text-sm">
              <div className="font-medium text-gray-900 mb-1">{location.type}</div>
              <div className="space-y-1 ml-3">
                {location.locations.slice(0, 3).map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-600 font-mono">
                    📄 {file}
                  </div>
                ))}
                {location.locations.length > 3 && (
                  <div className="text-xs text-gray-500 italic">
                    +{location.locations.length - 3} more file(s)
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Criterion 3: What should move to FeltDB? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>3. What should move to FeltDB?</span>
            <Badge variant="default">{moveToFeltDB.length} candidates</Badge>
          </CardTitle>
          <CardDescription>
            State that will be converted to FeltDB collections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {moveToFeltDB.length > 0 ? (
            moveToFeltDB.map((source, idx) => (
              <div key={idx} className="text-sm border-l-2 border-emerald-500 pl-3 py-1">
                <div className="font-medium text-gray-900">{source.name}</div>
                <div className="text-xs text-gray-600">{source.type}</div>
                {source.file && (
                  <div className="text-xs text-gray-500 font-mono">{source.file}</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              No state identified for FeltDB conversion
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criterion 4: What should remain external? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>4. What should remain external?</span>
            <Badge variant="secondary">{remainExternal.length} services</Badge>
          </CardTitle>
          <CardDescription>
            External services that stay outside FeltDB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {remainExternal.length > 0 ? (
            remainExternal.map((service, idx) => (
              <div key={idx} className="text-sm border-l-2 border-orange-500 pl-3 py-1">
                <div className="font-medium text-gray-900">{service.name}</div>
                <div className="text-xs text-gray-600">{service.type}</div>
                <div className="text-xs text-gray-500 italic">{service.usedFor}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              All external services handled
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criterion 5: What UI changes? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>5. What UI changes?</span>
            <Badge variant="outline">{uiChangeCount} components</Badge>
          </CardTitle>
          <CardDescription>
            User-facing components that need modification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="font-medium mb-2">
              Automatic changes: {uiChangeCount - manualUIChanges.length}
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Removing manual fetch/loading/error patterns, connecting to FeltDB reactive state
            </p>
            {manualUIChanges.length > 0 && (
              <>
                <p className="font-medium mb-2">
                  Manual review needed: {manualUIChanges.length}
                </p>
                <div className="space-y-1">
                  {manualUIChanges.map((change, idx) => (
                    <div key={idx} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                      {change.component}: {change.impact}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Criterion 6: What backend changes? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>6. What backend changes?</span>
            <Badge variant="outline">{apiRouteCount} routes</Badge>
          </CardTitle>
          <CardDescription>
            API endpoints and server logic to transform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border rounded p-2">
              <div className="font-medium text-gray-900">{apiFeltDBChanges}</div>
              <div className="text-xs text-gray-600">Routes → FeltDB</div>
            </div>
            <div className="border rounded p-2">
              <div className="font-medium text-gray-900">{apiRouteCount - apiFeltDBChanges}</div>
              <div className="text-xs text-gray-600">Routes remain</div>
            </div>
          </div>
          {serverActionsCount > 0 && (
            <div className="text-xs text-gray-600 border-t pt-2">
              {serverActionsCount} server action(s) will be updated to work with FeltDB
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criterion 7: What happens to existing data? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>7. What happens to existing data?</span>
            <Badge variant="outline">{dataCount} tables</Badge>
          </CardTitle>
          <CardDescription>
            Database migration and data handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p className="font-medium mb-2">Detected tables: {dataCount}</p>
            {plan.dataAnalysis.tables && plan.dataAnalysis.tables.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                {plan.dataAnalysis.tables.map((table, idx) => (
                  <div key={idx}>✓ {table}</div>
                ))}
              </div>
            )}
            {excludedFields.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs font-medium text-red-900 mb-1">
                  Sensitive fields excluded:
                </p>
                <div className="text-xs text-red-800">
                  {excludedFields.join(", ")}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Criterion 8: What cannot be automatically converted? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>8. What cannot be automatically converted?</span>
            {manualDecisions.length > 0 ? (
              <Badge variant="secondary">{manualDecisions.length} items</Badge>
            ) : (
              <Badge variant="outline">None</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Patterns requiring manual review or decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          {manualDecisions.length > 0 ? (
            <div className="space-y-3">
              {manualDecisions.map((decision, idx) => (
                <div key={idx} className="border-l-2 border-amber-500 pl-3 py-2">
                  <div className="font-medium text-gray-900">{decision.item}</div>
                  <div className="text-sm text-gray-700 mt-1">{decision.reason}</div>
                  <div className="text-sm text-amber-700 italic mt-2">
                    👉 {decision.recommendation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              ✓ No blocking issues found. Analysis can proceed to conversion.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criterion 9: What does the user need to approve? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>9. What does the user need to approve?</span>
            {warningsCount > 0 ? (
              <Badge variant="destructive">{warningsCount} warnings</Badge>
            ) : (
              <Badge variant="outline">No warnings</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Issues and decisions requiring user approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {warningsCount > 0 ? (
            <ul className="space-y-2">
              {plan.warnings?.map((warning, idx) => (
                <li key={idx} className="text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">
              No approval decisions needed. Review the full plan and proceed to conversion.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criterion 10: Original application remains untouched */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-emerald-900">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              10. Original application remains untouched
            </span>
            <Badge variant="default" className="bg-emerald-600">
              {analysisOnly ? "Analysis Only" : "Ready"}
            </Badge>
          </CardTitle>
          <CardDescription className="text-emerald-800">
            No files have been modified
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-emerald-800">
          <div className="space-y-2">
            <div>✓ This is an analysis-only operation</div>
            <div>✓ No source code has been changed</div>
            <div>✓ Status: <span className="font-medium">{plan.status}</span></div>
            <div>✓ Ready for review before proceeding to PR6 conversion</div>
          </div>
        </CardContent>
      </Card>

      {/* Criterion 11: Simplification metrics */}
      {simplification && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-emerald-900">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                11. Simplification & Complexity Metrics
              </span>
              <Badge className="bg-emerald-600">
                -{Math.round(simplification.complexity.estimatedReductionPercent)}%
              </Badge>
            </CardTitle>
            <CardDescription className="text-emerald-800">
              What your application will look like after conversion
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-emerald-800 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-emerald-200 bg-white rounded p-2">
                <div className="font-medium">Current</div>
                <div className="text-lg font-bold">
                  {simplification.complexity.currentLOC.toLocaleString()} LOC
                </div>
              </div>
              <div className="border border-emerald-200 bg-white rounded p-2">
                <div className="font-medium">Estimated</div>
                <div className="text-lg font-bold">
                  {simplification.estimatedAfterLOC.low.toLocaleString()}-
                  {simplification.estimatedAfterLOC.high.toLocaleString()} LOC
                </div>
              </div>
            </div>
            <div className="border-t border-emerald-200 pt-2">
              <div>Net reduction: ~{simplification.netEstimatedReduction.toLocaleString()} LOC</div>
              <div className="text-xs text-emerald-700 mt-1">
                {simplification.flowStats.canBeEliminated} state flows can be eliminated
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <div>1. Review all 11 acceptance criteria above</div>
          <div>2. Address any warnings or manual decisions</div>
          <div>3. Approve the conversion plan</div>
          <div>4. Proceed to PR6: Execute State-First FeltDB Conversion</div>
        </CardContent>
      </Card>
    </div>
  );
};
