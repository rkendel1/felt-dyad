import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface ImpactItem {
  name: string;
  type: "component" | "collection" | "service" | "backend";
  status: "affected" | "preserved";
}

interface ImpactAnalysisProps {
  affectedItems: ImpactItem[];
  totalImpact: "low" | "medium" | "high";
  summary?: string;
}

/**
 * ImpactAnalyzer Component
 *
 * Shows application impact of proposed changes:
 * - Affected UI components
 * - Affected FeltDB collections
 * - Affected backend services
 * - External service impact
 *
 * Displays warnings for major changes (3+ components, 2+ collections, etc)
 *
 * Part of PR8: FeltDB State-First Application Studio - Feature 4
 */
export const ImpactAnalyzer: React.FC<ImpactAnalysisProps> = ({
  affectedItems,
  totalImpact,
  summary,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["affected"]),
  );

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const affectedByType = affectedItems.reduce(
    (acc, item) => {
      if (item.status === "affected") {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
      }
      return acc;
    },
    {} as Record<string, ImpactItem[]>,
  );

  const preservedByType = affectedItems.reduce(
    (acc, item) => {
      if (item.status === "preserved") {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
      }
      return acc;
    },
    {} as Record<string, ImpactItem[]>,
  );

  const impactColors = {
    low: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400",
    medium:
      "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    high: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
  };

  const affectedCount = Object.values(affectedByType).reduce(
    (sum, items) => sum + items.length,
    0,
  );
  const preservedCount = Object.values(preservedByType).reduce(
    (sum, items) => sum + items.length,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>This change affects:</CardTitle>
          <Badge
            className={`${impactColors[totalImpact]} border shrink-0`}
            variant="outline"
          >
            {totalImpact === "high" && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {totalImpact === "high"
              ? `${affectedCount} item${affectedCount !== 1 ? "s" : ""}`
              : `${totalImpact} impact`}
          </Badge>
        </div>
        {summary && (
          <p className="text-xs text-muted-foreground mt-2">{summary}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Affected Items */}
        {affectedCount > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("affected")}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
            >
              {expandedCategories.has("affected") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-semibold">Affected ({affectedCount})</span>
            </button>
            {expandedCategories.has("affected") && (
              <div className="ml-6 space-y-3 pb-3 border-b border-border">
                {Object.entries(affectedByType).map(([type, items]) => (
                  <div key={type}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {type}s ({items.length})
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, idx) => (
                        <li key={idx} className="text-xs text-foreground ml-2">
                          • {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preserved Items */}
        {preservedCount > 0 && (
          <div>
            <button
              onClick={() => toggleCategory("preserved")}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2 -mx-2"
            >
              {expandedCategories.has("preserved") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-semibold">
                Preserved ({preservedCount})
              </span>
            </button>
            {expandedCategories.has("preserved") && (
              <div className="ml-6 space-y-3">
                {Object.entries(preservedByType).map(([type, items]) => (
                  <div key={type}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {type}s ({items.length})
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-muted-foreground ml-2"
                        >
                          ✓ {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {affectedCount === 0 && preservedCount === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              No items affected by this change
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
