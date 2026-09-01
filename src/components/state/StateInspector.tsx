import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Database, Eye, EyeOff } from "lucide-react";

interface RecordField {
  name: string;
  type: string;
  value?: string | number | boolean | null;
}

interface SelectedState {
  component?: {
    name: string;
    sourcePath: string;
  };
  collection?: {
    name: string;
    recordId?: string;
  };
  record?: {
    id: string;
    fields: RecordField[];
  };
}

interface StateInspectorProps {
  selectedState?: SelectedState;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  onEditWithAI?: () => void;
}

/**
 * StateInspector Component
 *
 * Shows what the Builder knows about a selected element:
 * - Component path
 * - State bindings
 * - FeltDB collection and record
 * - Record fields with types
 *
 * Part of PR8: FeltDB State-First Application Studio - Feature 6
 */
export const StateInspector: React.FC<StateInspectorProps> = ({
  selectedState,
  isVisible = true,
  onToggleVisibility,
  onEditWithAI,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["component", "state", "record"]),
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

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-l-2 border-l-blue-500">
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="text-sm">SELECTED</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onToggleVisibility?.(false)}
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {selectedState?.component && (
          <div>
            <button
              onClick={() => toggleSection("component")}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2"
            >
              {expandedSections.has("component") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-semibold">Component</span>
            </button>
            {expandedSections.has("component") && (
              <div className="ml-4 space-y-2 pb-2 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-mono text-xs break-all">
                    {selectedState.component.name}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="font-mono text-xs break-all text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    {selectedState.component.sourcePath}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedState?.collection && (
          <div>
            <button
              onClick={() => toggleSection("state")}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2"
            >
              {expandedSections.has("state") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Database className="h-4 w-4" />
              <span className="font-semibold">State</span>
            </button>
            {expandedSections.has("state") && (
              <div className="ml-4 space-y-2 pb-2 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Collection
                  </div>
                  <div className="font-semibold">
                    {selectedState.collection.name}
                  </div>
                </div>
                {selectedState.collection.recordId && (
                  <div>
                    <div className="text-xs text-muted-foreground">Record</div>
                    <div className="font-mono text-xs break-all">
                      {selectedState.collection.recordId}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedState?.record && (
          <div>
            <button
              onClick={() => toggleSection("record")}
              className="flex items-center gap-2 w-full hover:bg-muted/50 p-2 rounded mb-2"
            >
              {expandedSections.has("record") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-semibold">Fields</span>
            </button>
            {expandedSections.has("record") && (
              <div className="ml-4 space-y-2 pb-2 border-b border-border">
                {selectedState.record.fields.map((field) => (
                  <div key={field.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs">{field.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {field.type}
                      </Badge>
                    </div>
                    {field.value !== undefined && (
                      <div className="text-xs text-muted-foreground truncate">
                        {String(field.value)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedState && (
          <div className="text-center py-4">
            <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Click on a component in the preview to see its context
            </p>
          </div>
        )}

        <Button
          onClick={onEditWithAI}
          className="w-full"
          disabled={!selectedState}
          variant={selectedState ? "default" : "outline"}
        >
          Edit with AI
        </Button>
      </CardContent>
    </Card>
  );
};
