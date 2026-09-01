import React from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ipc } from "@/ipc/types";
import { ConversionSummary } from "./ConversionSummary";
import { ConversionDetails } from "./ConversionDetails";
import { AcceptanceCriteriaReport } from "./AcceptanceCriteriaReport";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConversionAnalysisViewProps {
  appId: number;
}

export const ConversionAnalysisView: React.FC<ConversionAnalysisViewProps> = ({
  appId,
}) => {
  const { data: plan, isLoading, error } = useQuery({
    queryKey: queryKeys.apps.conversionPlan({ appId }),
    queryFn: async () => {
      return ipc.conversionAnalysis.getConversionPlan({ appId });
    },
    enabled: !!appId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Analyzing application...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to analyze application: {String(error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!plan) {
    return (
      <Alert>
        <AlertDescription>No conversion plan available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Tabbed interface for different views */}
      <div className="flex gap-2 mb-6 border-b">
        <button className="px-4 py-2 border-b-2 border-blue-500 text-blue-600 font-medium">
          Overview
        </button>
        <button className="px-4 py-2 border-b border-gray-200 text-gray-600 hover:text-gray-900">
          Detailed Analysis
        </button>
        <button className="px-4 py-2 border-b border-gray-200 text-gray-600 hover:text-gray-900">
          Acceptance Criteria
        </button>
      </div>

      <div className="space-y-6">
        <ConversionSummary plan={plan} />
        <ConversionDetails plan={plan} />
        <AcceptanceCriteriaReport plan={plan} />
      </div>
    </div>
  );
};
