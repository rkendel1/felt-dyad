import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { queryKeys } from "@/lib/queryKeys";
import { applicationIntelligenceClient } from "@/ipc/types/application-intelligence-contracts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  MessageCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { AskAboutAppDialog } from "./AskAboutAppDialog";
import { cn } from "@/lib/utils";

export function ApplicationIntelligenceScreen() {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [showAskDialog, setShowAskDialog] = useState(false);

  const {
    data: intelligence,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: selectedAppId
      ? queryKeys.applicationIntelligence.detail({ appId: selectedAppId })
      : (["app-intelligence"] as const),
    queryFn: async () => {
      if (!selectedAppId) return null;
      const result = await applicationIntelligenceClient.get({
        appId: selectedAppId,
      });
      return result;
    },
    enabled: !!selectedAppId,
    staleTime: 30000, // 30 seconds
  });

  const { data: reconciliationStatus } = useQuery({
    queryKey: selectedAppId
      ? queryKeys.applicationIntelligence.reconciliationStatus({
          appId: selectedAppId,
        })
      : (["reconciliation"] as const),
    queryFn: async () => {
      if (!selectedAppId) return null;
      return await applicationIntelligenceClient.getReconciliationStatus({
        appId: selectedAppId,
      });
    },
    enabled: !!selectedAppId,
    staleTime: 60000, // 1 minute
  });

  if (!selectedAppId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select an application to view its intelligence</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading application intelligence...
          </p>
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Intelligence</CardTitle>
            <CardDescription>
              Build understanding of your application structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No application intelligence has been generated yet. Index your
                application to get started.
              </p>
              <Button onClick={() => refetch()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Index Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const componentCount = intelligence.components?.length ?? 0;
  const pageCount = intelligence.pages?.length ?? 0;
  const featureCount = intelligence.features?.length ?? 0;
  const collectionCount = intelligence.collections?.length ?? 0;
  const serviceCount = intelligence.externalServices?.length ?? 0;

  return (
    <div className="space-y-6 p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Application Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Understanding of your application's structure and relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAskDialog(true)}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Ask About App
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Reconciliation Status */}
      {reconciliationStatus &&
        reconciliationStatus.status !== "synchronized" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900">
                    Application Changed
                  </h3>
                  <p className="text-sm text-amber-800 mt-1">
                    {reconciliationStatus.filesChanged} files have changed since
                    last index.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 text-amber-700 border-amber-300"
                    onClick={() => refetch()}
                  >
                    Update Intelligence
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Sync Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Sync Status</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {reconciliationStatus?.status === "synchronized" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Synchronized
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  Out of Sync
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {reconciliationStatus?.lastIndexedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last indexed:</span>
              <span>
                {new Date(reconciliationStatus.lastIndexedAt).toLocaleString()}
              </span>
            </div>
          )}
          {reconciliationStatus?.filesChanged !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Files changed:</span>
              <span className="font-medium">
                {reconciliationStatus.filesChanged}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Components" value={componentCount} icon="component" />
        <StatCard title="Pages" value={pageCount} icon="page" />
        <StatCard title="Features" value={featureCount} icon="feature" />
        <StatCard title="Collections" value={collectionCount} icon="database" />
        <StatCard title="Services" value={serviceCount} icon="service" />
      </div>

      {/* Application Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Features Section */}
        {intelligence.features && intelligence.features.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
              <CardDescription>
                Grouped application functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intelligence.features.slice(0, 10).map((feature) => (
                  <div
                    key={feature.id}
                    className="text-sm p-2 rounded bg-muted"
                  >
                    <div className="font-medium">{feature.name}</div>
                    {feature.description && (
                      <div className="text-xs text-muted-foreground">
                        {feature.description}
                      </div>
                    )}
                  </div>
                ))}
                {intelligence.features.length > 10 && (
                  <div className="text-xs text-muted-foreground">
                    +{intelligence.features.length - 10} more features
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collections Section */}
        {intelligence.collections && intelligence.collections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Data</CardTitle>
              <CardDescription>FeltDB collections and state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {intelligence.collections.slice(0, 10).map((collection) => (
                  <div
                    key={collection.id}
                    className="text-sm p-2 rounded bg-muted"
                  >
                    <div className="font-medium">{collection.name}</div>
                    {collection.fields && (
                      <div className="text-xs text-muted-foreground">
                        {collection.fields.length} fields
                      </div>
                    )}
                  </div>
                ))}
                {intelligence.collections.length > 10 && (
                  <div className="text-xs text-muted-foreground">
                    +{intelligence.collections.length - 10} more collections
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Services Section */}
        {intelligence.externalServices &&
          intelligence.externalServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connected Services</CardTitle>
                <CardDescription>
                  External APIs and integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {intelligence.externalServices.slice(0, 10).map((service) => (
                    <div
                      key={service.id}
                      className="text-sm p-2 rounded bg-muted"
                    >
                      <div className="font-medium">{service.name}</div>
                      {service.type && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {service.type}
                        </div>
                      )}
                    </div>
                  ))}
                  {intelligence.externalServices.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      +{intelligence.externalServices.length - 10} more services
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Recent Changes Section */}
        {intelligence.recentChanges &&
          intelligence.recentChanges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Changes</CardTitle>
                <CardDescription>
                  Latest AI and user modifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {intelligence.recentChanges.slice(0, 5).map((change: any) => (
                    <div
                      key={change.id}
                      className="text-sm p-2 rounded bg-muted"
                    >
                      <div className="font-medium">{change.request}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(change.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {intelligence.recentChanges.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{intelligence.recentChanges.length - 5} more changes
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Ask About App Dialog */}
      <AskAboutAppDialog open={showAskDialog} onOpenChange={setShowAskDialog} />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}
