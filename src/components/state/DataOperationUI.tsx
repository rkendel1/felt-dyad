import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, X } from "lucide-react";

interface DataField {
  name: string;
  type: string;
  required?: boolean;
  value?: string | number | boolean;
}

interface DataOperationUIProps {
  collection: string;
  operation: "create" | "update" | "delete";
  fields: DataField[];
  onExecute?: (
    operation: "create" | "update" | "delete",
    data: Record<string, any>,
  ) => void;
  isLoading?: boolean;
}

/**
 * DataOperationUI Component
 *
 * Provides safe UI for non-developers to create, update, or delete records in FeltDB.
 * Shows all fields, their types, and validation before applying changes.
 *
 * Part of PR8: FeltDB State-First Application Studio - Feature 9
 */
export const DataOperationUI: React.FC<DataOperationUIProps> = ({
  collection,
  operation,
  fields,
  onExecute,
  isLoading,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(
    fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]: field.value || "",
      }),
      {},
    ),
  );

  const [showPreview, setShowPreview] = useState(false);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleExecute = () => {
    onExecute?.(operation, formData);
  };

  const operationLabels = {
    create: "Create Record",
    update: "Update Record",
    delete: "Delete Record",
  };

  const operationColors = {
    create: "bg-green-500/10 text-green-700 dark:text-green-400",
    update: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    delete: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{operationLabels[operation]}</CardTitle>
          <Badge className={operationColors[operation]} variant="outline">
            {collection}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form Fields */}
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1">
              <label className="text-sm font-medium">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
                <Badge variant="outline" className="ml-2 text-xs">
                  {field.type}
                </Badge>
              </label>
              {field.type === "boolean" ? (
                <select
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    handleFieldChange(field.name, e.target.value === "true")
                  }
                  className="w-full px-3 py-2 rounded border border-border bg-background text-sm"
                  disabled={isLoading}
                >
                  <option value="">-- Select --</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={formData[field.name] || ""}
                  onChange={(e) =>
                    handleFieldChange(
                      field.name,
                      field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  placeholder={`Enter ${field.name}`}
                  disabled={isLoading}
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>

        {/* Preview Toggle */}
        <div className="border-t border-border pt-3">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {showPreview ? "Hide Preview" : "Preview Changes"}
          </Button>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-muted/50 p-3 rounded space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              CHANGES:
            </div>
            {Object.entries(formData).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="font-mono">{key}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="font-semibold">
                  {String(value) === "" ? "(empty)" : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          <Button
            onClick={handleExecute}
            className="flex-1"
            disabled={isLoading}
            variant={operation === "delete" ? "destructive" : "default"}
          >
            {operation === "delete" ? (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            ) : operation === "create" ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Update
              </>
            )}
          </Button>
          <Button
            onClick={() => setFormData({})}
            variant="outline"
            disabled={isLoading}
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
