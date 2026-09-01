import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ImpactedEntity {
  id: string;
  name: string;
  type: "component" | "collection" | "service" | "feature" | "file";
  confidence: number;
}

export interface ProposalImpact {
  affected: {
    components: ImpactedEntity[];
    collections: ImpactedEntity[];
    services: ImpactedEntity[];
    files: ImpactedEntity[];
  };
  risk: "low" | "medium" | "high" | "critical";
  requiresApproval: boolean;
  estimatedTokens: number;
  validationInfo?: {
    buildRequired: boolean;
    testsRequired: boolean;
    migrationsRequired: boolean;
  };
}

interface ApplicationProposalCardProps {
  title: string;
  description: string;
  impact: ProposalImpact;
  onApply?: () => void | Promise<void>;
  onReject?: () => void;
  isApplying?: boolean;
}

const RISK_CONFIG = {
  low: {
    color: "bg-green-100 text-green-900",
    icon: CheckCircle,
    label: "Low Risk",
  },
  medium: {
    color: "bg-yellow-100 text-yellow-900",
    icon: AlertTriangle,
    label: "Medium Risk",
  },
  high: {
    color: "bg-orange-100 text-orange-900",
    icon: AlertTriangle,
    label: "High Risk",
  },
  critical: {
    color: "bg-red-100 text-red-900",
    icon: AlertCircle,
    label: "Critical Risk",
  },
};

export function ApplicationProposalCard({
  title,
  description,
  impact,
  onApply,
  onReject,
  isApplying = false,
}: ApplicationProposalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const riskConfig = RISK_CONFIG[impact.risk];
  const RiskIcon = riskConfig.icon;

  // Count total affected entities
  const totalAffected =
    (impact.affected.components?.length || 0) +
    (impact.affected.collections?.length || 0) +
    (impact.affected.services?.length || 0) +
    (impact.affected.files?.length || 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              {impact.requiresApproval && (
                <Badge variant="outline" className="ml-auto">
                  Requires Approval
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Assessment */}
        <div
          className={cn(
            "p-3 rounded-lg flex items-center gap-3",
            riskConfig.color,
          )}
        >
          <RiskIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-medium">{riskConfig.label}</div>
            <div className="text-sm opacity-90">
              Affects {totalAffected}{" "}
              {totalAffected === 1 ? "entity" : "entities"}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {impact.affected.components &&
            impact.affected.components.length > 0 && (
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-2xl font-bold">
                  {impact.affected.components.length}
                </div>
                <div className="text-xs text-muted-foreground">Component</div>
              </div>
            )}
          {impact.affected.collections &&
            impact.affected.collections.length > 0 && (
              <div className="text-center p-2 rounded bg-muted">
                <div className="text-2xl font-bold">
                  {impact.affected.collections.length}
                </div>
                <div className="text-xs text-muted-foreground">Collection</div>
              </div>
            )}
          {impact.affected.services && impact.affected.services.length > 0 && (
            <div className="text-center p-2 rounded bg-muted">
              <div className="text-2xl font-bold">
                {impact.affected.services.length}
              </div>
              <div className="text-xs text-muted-foreground">Service</div>
            </div>
          )}
          {impact.affected.files && impact.affected.files.length > 0 && (
            <div className="text-center p-2 rounded bg-muted">
              <div className="text-2xl font-bold">
                {impact.affected.files.length}
              </div>
              <div className="text-xs text-muted-foreground">File</div>
            </div>
          )}
        </div>

        {/* Expandable Impact Details */}
        {totalAffected > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {expanded ? "Hide" : "Show"} Impact Details
            </button>

            {expanded && (
              <div className="mt-3 space-y-4 pt-3 border-t">
                {/* Affected Components */}
                {impact.affected.components &&
                  impact.affected.components.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Components ({impact.affected.components.length})
                      </h4>
                      <div className="space-y-1">
                        {impact.affected.components.map((entity) => (
                          <div
                            key={entity.id}
                            className="text-sm p-2 rounded bg-muted/50 flex justify-between"
                          >
                            <span>{entity.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(entity.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Affected Collections */}
                {impact.affected.collections &&
                  impact.affected.collections.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Collections ({impact.affected.collections.length})
                      </h4>
                      <div className="space-y-1">
                        {impact.affected.collections.map((entity) => (
                          <div
                            key={entity.id}
                            className="text-sm p-2 rounded bg-muted/50 flex justify-between"
                          >
                            <span>{entity.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(entity.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Affected Services */}
                {impact.affected.services &&
                  impact.affected.services.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        External Services ({impact.affected.services.length})
                      </h4>
                      <div className="space-y-1">
                        {impact.affected.services.map((entity) => (
                          <div
                            key={entity.id}
                            className="text-sm p-2 rounded bg-muted/50 flex justify-between"
                          >
                            <span>{entity.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(entity.confidence * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Affected Files */}
                {impact.affected.files && impact.affected.files.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      Files ({impact.affected.files.length})
                    </h4>
                    <div className="space-y-1">
                      {impact.affected.files.map((entity) => (
                        <div
                          key={entity.id}
                          className="text-sm p-2 rounded bg-muted/50 flex justify-between font-mono text-xs"
                        >
                          <span>{entity.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(entity.confidence * 100)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Validation Requirements */}
        {impact.validationInfo && (
          <div className="p-3 rounded-lg bg-muted space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Validation
            </h4>
            <div className="space-y-1 text-sm">
              {impact.validationInfo.buildRequired && (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  <span>Build verification required</span>
                </div>
              )}
              {impact.validationInfo.testsRequired && (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  <span>Tests must pass</span>
                </div>
              )}
              {impact.validationInfo.migrationsRequired && (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  <span>Database migrations needed</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Token Estimate */}
        <div className="text-xs text-muted-foreground">
          Estimated tokens: {impact.estimatedTokens.toLocaleString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onApply}
            disabled={isApplying}
            className="flex-1"
            size="sm"
          >
            {isApplying ? "Applying..." : "Apply Change"}
          </Button>
          {onReject && (
            <Button
              onClick={onReject}
              disabled={isApplying}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example hook for generating proposals with impact
 */
export function useApplicationProposal() {
  const generateProposal = (
    title: string,
    description: string,
    selectedComponent: any,
    intelligence: any,
  ): ProposalImpact => {
    // This is a framework ready example
    // In real implementation, this would analyze the actual impact

    const components = intelligence.components || [];
    const collections = intelligence.collections || [];
    const services = intelligence.externalServices || [];
    const files = intelligence.files || [];

    // Simulate impact analysis
    const affectedComponents = components
      .filter((c: any) => c.id !== selectedComponent?.id)
      .slice(0, Math.max(1, Math.floor(components.length * 0.1)))
      .map((c: any) => ({ ...c, confidence: 0.85 }));

    const affectedCollections = collections
      .slice(0, Math.max(1, Math.floor(collections.length * 0.2)))
      .map((c: any) => ({ ...c, confidence: 0.9 }));

    const affectedServices = services
      .slice(0, 1)
      .map((s: any) => ({ ...s, confidence: 0.75 }));

    const affectedFiles = files
      .slice(0, Math.max(1, Math.floor(files.length * 0.15)))
      .map((f: any) => ({ ...f, confidence: 0.95 }));

    const totalAffected =
      affectedComponents.length +
      affectedCollections.length +
      affectedServices.length +
      affectedFiles.length;

    let risk: "low" | "medium" | "high" | "critical" = "low";
    if (totalAffected > 5) risk = "medium";
    if (totalAffected > 10) risk = "high";
    if (affectedCollections.length > 2 || affectedServices.length > 0)
      risk = "high";
    if (
      affectedCollections.length > 3 ||
      (affectedServices.length > 0 && affectedComponents.length > 5)
    )
      risk = "critical";

    return {
      affected: {
        components: affectedComponents,
        collections: affectedCollections,
        services: affectedServices,
        files: affectedFiles,
      },
      risk,
      requiresApproval: risk === "high" || risk === "critical",
      estimatedTokens: 1500 + totalAffected * 200,
      validationInfo: {
        buildRequired: affectedFiles.length > 0,
        testsRequired: affectedComponents.length > 0,
        migrationsRequired: affectedCollections.length > 0,
      },
    };
  };

  return { generateProposal };
}
