import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ipc } from "@/ipc/types";
import { ConversionSummary } from "./ConversionSummary";
import { ConversionDetails } from "./ConversionDetails";
import { AcceptanceCriteriaReport } from "./AcceptanceCriteriaReport";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApproveConversion } from "@/hooks/useConversionExecution";

export interface ConversionAnalysisViewProps {
  appId: number;
}

export const ConversionAnalysisView: React.FC<ConversionAnalysisViewProps> = ({
  appId,
}) => {
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const approveConversion = useApproveConversion();
  const {
    data: plan,
    isLoading,
    error,
  } = useQuery({
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
    <Tabs defaultValue="overview" className="w-full">
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Conversion plan</span>
            <Badge
              variant={
                plan.status === "PENDING_APPROVAL" ? "outline" : "secondary"
              }
            >
              {plan.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.status === "PENDING_APPROVAL"
              ? "Review the findings, then approve this plan to record your decision."
              : "This FeltDB conversion plan has been approved."}
          </p>
        </div>
        {plan.status === "PENDING_APPROVAL" && (
          <Button onClick={() => setIsApprovalDialogOpen(true)}>
            Approve FeltDB conversion
          </Button>
        )}
      </div>

      <TabsList className="mb-6 grid h-auto w-full grid-cols-3 rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="details"
          className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
        >
          Detailed Analysis
        </TabsTrigger>
        <TabsTrigger
          value="acceptance"
          className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
        >
          Acceptance Criteria
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <ConversionSummary plan={plan} />
      </TabsContent>
      <TabsContent value="details" className="mt-0">
        <ConversionDetails plan={plan} />
      </TabsContent>
      <TabsContent value="acceptance" className="mt-0">
        <AcceptanceCriteriaReport plan={plan} />
      </TabsContent>

      <Dialog
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve this FeltDB conversion plan?</DialogTitle>
            <DialogDescription>
              This records your approval of the proposed state, API, and data
              changes. Approval itself does not modify project files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
              disabled={approveConversion.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await approveConversion.mutateAsync(appId);
                setIsApprovalDialogOpen(false);
              }}
              disabled={approveConversion.isPending}
            >
              {approveConversion.isPending ? "Approving…" : "Approve plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};
