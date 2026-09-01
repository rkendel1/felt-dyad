import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ChevronDown, ChevronRight } from "lucide-react";

interface StateCollection {
  name: string;
  recordCount: number;
}

interface StateSurfaceProps {
  collections: StateCollection[];
  onSelectCollection?: (collectionName: string) => void;
}

/**
 * StateSurface Component
 * 
 * Displays FeltDB collections and record counts in a non-developer friendly way.
 * Shows collections like "Customers: 2,341" with a friendly interface.
 * Part of PR8: FeltDB State-First Application Studio
 */
export const StateSurface: React.FC<StateSurfaceProps> = ({
  collections,
  onSelectCollection,
}) => {
  const [expandedCollections, setExpandedCollections] = useState<
    Set<string>
  >(new Set());

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
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Your App's Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No collections yet. Start building to see your app's state here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Your App's Memory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {collections.map((collection) => (
          <div
            key={collection.name}
            className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleExpanded(collection.name)}
                  className="p-0 hover:bg-muted rounded"
                >
                  {expandedCollections.has(collection.name) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <span className="font-medium">{collection.name}</span>
              </div>
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {collection.recordCount.toLocaleString()}
            </div>
          </div>
        ))}
        <Button
          onClick={() => onSelectCollection?.("")}
          variant="outline"
          className="w-full mt-4"
        >
          Open State Inspector
        </Button>
      </CardContent>
    </Card>
  );
};
