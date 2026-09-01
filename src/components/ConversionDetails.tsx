import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionPlan } from "@/ipc/types";
import { ChevronDown, ChevronRight, Database, Zap, Layers, Globe, TrendingDown } from "lucide-react";
import { SimplificationDetails } from "./SimplificationDetails";

export interface ConversionDetailsProps {
  plan: ConversionPlan;
}

export const ConversionDetails: React.FC<ConversionDetailsProps> = ({
  plan,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["state", "ui", "backend", "data", "external", "simplification"]),
  );

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  return (
    <div className="space-y-4">
      {/* State Analysis */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted"
          onClick={() => toggleSection("state")}
        >
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              State Management
            </div>
            {expandedSections.has("state") ? <ChevronDown /> : <ChevronRight />}
          </CardTitle>
          <CardDescription>
            {plan.stateAnalysis.sources.length} state sources identified
          </CardDescription>
        </CardHeader>
        {expandedSections.has("state") && (
          <CardContent>
            <div className="space-y-2">
              {plan.stateAnalysis.sources.map((source, idx) => (
                <div key={idx} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{source.type}</span>
                    <Badge variant="outline">{source.classification}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {source.description || source.name}
                  </div>
                  {source.file && (
                    <div className="mt-1 text-xs font-mono text-muted-foreground">
                      {source.file}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* UI Changes */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted"
          onClick={() => toggleSection("ui")}
        >
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              UI Changes
            </div>
            {expandedSections.has("ui") ? <ChevronDown /> : <ChevronRight />}
          </CardTitle>
          <CardDescription>
            {plan.uiChanges.length} components require changes
          </CardDescription>
        </CardHeader>
        {expandedSections.has("ui") && (
          <CardContent>
            <div className="space-y-3">
              {plan.uiChanges.map((change, idx) => (
                <div key={idx} className="rounded border p-3 text-sm">
                  <div className="font-medium">{change.component}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {change.impact}
                  </div>
                  <div className="mt-2 space-y-1 font-mono text-xs">
                    <div>
                      <span className="text-red-600">-</span> {change.currentPattern}
                    </div>
                    <div>
                      <span className="text-green-600">+</span> {change.proposedPattern}
                    </div>
                  </div>
                  {change.isManual && (
                    <Badge className="mt-2" variant="outline">
                      Manual Review Required
                    </Badge>
                  )}
                </div>
              ))}
              {plan.uiChanges.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No UI changes needed
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Backend Changes */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted"
          onClick={() => toggleSection("backend")}
        >
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Backend Changes
            </div>
            {expandedSections.has("backend") ? <ChevronDown /> : <ChevronRight />}
          </CardTitle>
          <CardDescription>
            {plan.backendAnalysis.apiRoutes.length} API routes identified
          </CardDescription>
        </CardHeader>
        {expandedSections.has("backend") && (
          <CardContent>
            <div className="space-y-2">
              {plan.backendAnalysis.apiRoutes.map((route, idx) => (
                <div key={idx} className="rounded border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {route.method}
                    </Badge>
                    <span className="font-mono text-xs">{route.path}</span>
                  </div>
                  {route.description && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {route.description}
                    </div>
                  )}
                </div>
              ))}
              {plan.backendAnalysis.apiRoutes.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No API routes identified
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Analysis */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted"
          onClick={() => toggleSection("data")}
        >
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data & Schema
            </div>
            {expandedSections.has("data") ? <ChevronDown /> : <ChevronRight />}
          </CardTitle>
          <CardDescription>
            {plan.dataAnalysis.database ? `${plan.dataAnalysis.database} database` : "No database"}
          </CardDescription>
        </CardHeader>
        {expandedSections.has("data") && (
          <CardContent>
            <div className="space-y-3">
              <div className="rounded border p-3 text-sm">
                <div className="font-medium">{plan.dataAnalysis.database}</div>
                {plan.dataAnalysis.schema && plan.dataAnalysis.schema.tables.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Tables ({plan.dataAnalysis.totalTables}):
                    </div>
                    <ul className="mt-1 space-y-1">
                      {plan.dataAnalysis.schema.tables.map((table, tidx) => (
                        <li key={tidx} className="text-xs">
                          • {table.name}
                          {table.rowCount !== undefined && ` (${table.rowCount.toLocaleString()} rows)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Simplification Analysis */}
      {plan.simplification && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-muted"
            onClick={() => toggleSection("simplification")}
          >
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Complexity Reduction
              </div>
              {expandedSections.has("simplification") ? <ChevronDown /> : <ChevronRight />}
            </CardTitle>
            <CardDescription>
              Estimated {Math.round(plan.simplification.complexity.estimatedReductionPercent)}% code reduction
            </CardDescription>
          </CardHeader>
          {expandedSections.has("simplification") && (
            <CardContent>
              <SimplificationDetails simplification={plan.simplification} />
            </CardContent>
          )}
        </Card>
      )}

      {/* External Services */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-muted"
          onClick={() => toggleSection("external")}
        >
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              External Services
            </div>
            {expandedSections.has("external") ? <ChevronDown /> : <ChevronRight />}
          </CardTitle>
          <CardDescription>
            {plan.externalServices.length} external service(s) identified
          </CardDescription>
        </CardHeader>
        {expandedSections.has("external") && (
          <CardContent>
            <div className="space-y-2">
              {plan.externalServices.map((service, idx) => (
                <div key={idx} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="outline">{service.type}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {service.usedFor}
                  </div>
                </div>
              ))}
              {plan.externalServices.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  No external services identified
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
