import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, ArrowRight, GitBranch } from "lucide-react";

interface ComponentUsage {
  name: string;
  type: "uses" | "updates";
}

interface CollectionRelationship {
  name: string;
  usedBy: ComponentUsage[];
  updatedBy: ComponentUsage[];
}

interface RelationshipPanelProps {
  collections: CollectionRelationship[];
}

/**
 * RelationshipPanel Component
 *
 * Shows which components use which FeltDB collections and vice versa.
 * Displays state-UI dependency graph in a simple panel format.
 *
 * Part of PR8: FeltDB State-First Application Studio - Feature 8
 */
export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({
  collections,
}) => {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = (collectionName: string) => {
    const newSet = new Set(expandedCollections);
    if (newSet.has(collectionName)) {
      newSet.delete(collectionName);
    } else {
      newSet.add(collectionName);
    }
    setExpandedCollections(newSet);
  };

  if (collections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            State Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No collections found in your application.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          State Relationships
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {collections.map((collection) => (
          <div key={collection.name} className="space-y-2">
            <button
              onClick={() => toggleExpanded(collection.name)}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded -mx-2"
            >
              {expandedCollections.has(collection.name) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-semibold">{collection.name}</span>
            </button>

            {expandedCollections.has(collection.name) && (
              <div className="ml-6 space-y-3 pt-2 border-t border-border">
                {collection.usedBy.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      USED BY
                    </div>
                    <div className="space-y-1">
                      {collection.usedBy.map((usage, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs ml-2"
                        >
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{usage.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {collection.updatedBy.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      UPDATED BY
                    </div>
                    <div className="space-y-1">
                      {collection.updatedBy.map((usage, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs ml-2"
                        >
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                          <span>{usage.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {collection.usedBy.length === 0 &&
                  collection.updatedBy.length === 0 && (
                    <div className="text-xs text-muted-foreground ml-2">
                      No relationships found
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
