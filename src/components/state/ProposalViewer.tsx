import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Database,
  FileCode,
  AlertCircle,
} from "lucide-react";

interface UIChange {
  component: string;
  action: string;
  details?: string;
}

interface StateChange {
  collection: string;
  field: string;
  type: string;
  details?: string;
}

interface DataChange {
  collection: string;
  operation: string;
  recordCount?: number;
  details?: string;
}

interface FileChange {
  path: string;
  type: "write" | "rename" | "delete";
  summary: string;
}

interface ProposalViewerProps {
  title: string;
  description?: string;
  uiChanges: UIChange[];
  stateChanges: StateChange[];
  dataChanges: DataChange[];
  fileChanges: FileChange[];
  impactLevel?: "low" | "medium" | "high";
  onApply?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
}

/**
 * ProposalViewer Component
 *
 * Shows structured breakdown of proposed changes:
 * - UI changes (component modifications)
 * - State changes (FeltDB collection/field changes)
 * - Data changes (records affected)
 * - Files (which files will be modified)
 *
 * Part of PR8: FeltDB State-First Application Studio - Feature 3
 */
export const ProposalViewer: React.FC<ProposalViewerProps> = ({
  title,
  description,
  uiChanges,
  stateChanges,
  dataChanges,
  fileChanges,
  impactLevel = "low",
  onApply,
  onEdit,
  isLoading,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["ui", "state", "data", "files"]),
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

  const impactColors = {
    low: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400",
    medium:
      "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    high: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
  };

  const totalChanges =
    uiChanges.length + stateChanges.length + dataChanges.length;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {impactLevel && (
            <Badge
              className={`${impactColors[impactLevel]} border shrink-0`}
              variant="outline"
            >
              {impactLevel === "high" && (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              {impactLevel === "high" ? "Major Impact" : impactLevel}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {totalChanges} changes across UI, State, and Data
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* UI Changes */}
        <div>
          <button
            onClick={() => toggleSection("ui")}
            className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
          >
            {expandedSections.has("ui") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Layers className="h-4 w-4" />
            <span className="font-semibold">UI</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {uiChanges.length}
            </Badge>
          </button>
          {expandedSections.has("ui") && (
            <div className="ml-6 space-y-2 pb-3 border-b border-border">
              {uiChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">No UI changes</p>
              ) : (
                uiChanges.map((change, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{change.component}</span>
                      <Badge variant="outline" className="text-xs">
                        {change.action}
                      </Badge>
                    </div>
                    {change.details && (
                      <div className="text-muted-foreground ml-2">
                        {change.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* State Changes */}
        <div>
          <button
            onClick={() => toggleSection("state")}
            className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
          >
            {expandedSections.has("state") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Database className="h-4 w-4" />
            <span className="font-semibold">State</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {stateChanges.length}
            </Badge>
          </button>
          {expandedSections.has("state") && (
            <div className="ml-6 space-y-2 pb-3 border-b border-border">
              {stateChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No state changes
                </p>
              ) : (
                stateChanges.map((change, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{change.collection}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono">{change.field}</span>
                      <Badge variant="outline" className="text-xs">
                        {change.type}
                      </Badge>
                    </div>
                    {change.details && (
                      <div className="text-muted-foreground ml-2">
                        {change.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Data Changes */}
        <div>
          <button
            onClick={() => toggleSection("data")}
            className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
          >
            {expandedSections.has("data") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Database className="h-4 w-4" />
            <span className="font-semibold">Data</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {dataChanges.length}
            </Badge>
          </button>
          {expandedSections.has("data") && (
            <div className="ml-6 space-y-2 pb-3 border-b border-border">
              {dataChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data changes</p>
              ) : (
                dataChanges.map((change, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{change.collection}</span>
                      <Badge variant="outline" className="text-xs">
                        {change.operation}
                      </Badge>
                      {change.recordCount && (
                        <span className="text-muted-foreground">
                          ({change.recordCount} records)
                        </span>
                      )}
                    </div>
                    {change.details && (
                      <div className="text-muted-foreground ml-2">
                        {change.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Files */}
        <div>
          <button
            onClick={() => toggleSection("files")}
            className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
          >
            {expandedSections.has("files") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <FileCode className="h-4 w-4" />
            <span className="font-semibold">Files</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {fileChanges.length}
            </Badge>
          </button>
          {expandedSections.has("files") && (
            <div className="ml-6 space-y-2 pb-3">
              {fileChanges.length === 0 ? (
                <p className="text-xs text-muted-foreground">No file changes</p>
              ) : (
                fileChanges.map((change, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          change.type === "delete" ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {change.type}
                      </Badge>
                      <span className="font-mono break-all">{change.path}</span>
                    </div>
                    <div className="text-muted-foreground ml-2">
                      {change.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onEdit} variant="outline" disabled={isLoading}>
            Edit proposal
          </Button>
          <Button onClick={onApply} disabled={isLoading} className="flex-1">
            {isLoading ? "Applying..." : "Apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
