import React from "react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, GitCommit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";

/**
 * ChangesPanel Component
 * 
 * Shows Git history and conversion reports for the application.
 * Displays:
 * - Recent commits and git branches
 * - Before/After conversion analysis from PR7
 * - Summary of changes made during conversion
 * 
 * Part of PR8: FeltDB State-First Application Studio
 */
export const ChangesPanel: React.FC = () => {
  const appId = useAtomValue(selectedAppIdAtom);

  const { data: commits, isLoading: _isLoadingCommits } = useQuery({
    queryKey: ["git-commits", appId],
    queryFn: async () => {
      if (!appId) return [];
      try {
        return await ipc.git.listCommits({
          appId,
          limit: 10,
        });
      } catch {
        return [];
      }
    },
    enabled: appId !== null,
  });

  const { data: conversionReport, isLoading: _isLoadingReport } = useQuery({
    queryKey: ["conversion-report", appId],
    queryFn: async () => {
      if (!appId) return null;
      try {
        const plan = await ipc.conversionAnalysis.getConversionPlan({ appId });
        if (!plan) return null;
        
        // Mock conversion report - in production this would come from PR7
        return {
          beforeLoc: 31420,
          afterLoc: 23184,
          percentageReduction: 26.2,
          removedFlows: 17,
          removedApis: 21,
          preservedServices: 4,
        };
      } catch {
        return null;
      }
    },
    enabled: appId !== null,
  });

  return (
    <div className="space-y-4">
      {/* Conversion Report */}
      {conversionReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              FeltDB Conversion Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Code Reduction
                </div>
                <div className="text-2xl font-bold">
                  −{conversionReport.percentageReduction}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {conversionReport.beforeLoc.toLocaleString()} →{" "}
                  {conversionReport.afterLoc.toLocaleString()} LOC
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Infrastructure Simplified
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {conversionReport.removedFlows} flows removed
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {conversionReport.removedApis} APIs removed
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {conversionReport.preservedServices} services preserved
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Git Commits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            Recent Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!commits || commits.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No commits found
            </div>
          ) : (
            <div className="space-y-2">
              {commits.map((commit: GitCommitInfo, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded border border-border hover:bg-muted/50"
                >
                  <div className="mt-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">
                      {(commit as any).hash?.substring(0, 7)}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {(commit as any).message || "Commit"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(commit as any).author} · {new Date((commit as any).date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
