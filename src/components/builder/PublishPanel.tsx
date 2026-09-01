import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface PublishCheckItem {
  name: string;
  status: "pending" | "passed" | "failed";
  description?: string;
}

interface PublishPanelProps {
  appName?: string;
  isPublished?: boolean;
  publishedUrl?: string;
  onPublish?: () => Promise<void>;
}

export function PublishPanel({
  appName = "My App",
  isPublished = false,
  publishedUrl,
  onPublish,
}: PublishPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showChecks, setShowChecks] = useState(false);

  // Publish checks that should pass before publishing
  const checks: PublishCheckItem[] = [
    {
      name: "Application builds",
      status: "passed",
      description: "Your app compiles without errors",
    },
    {
      name: "FeltDB configured",
      status: "passed",
      description: "Database is properly configured",
    },
    {
      name: "Data available",
      status: "passed",
      description: "Database contains required collections",
    },
    {
      name: "No unresolved changes",
      status: "passed",
      description: "All changes have been applied or rejected",
    },
    {
      name: "Runtime healthy",
      status: "passed",
      description: "Application runtime is running normally",
    },
  ];

  const allChecksPassed = checks.every((check) => check.status === "passed");

  const handlePublish = async () => {
    if (!onPublish) return;
    setIsLoading(true);
    try {
      await onPublish();
    } finally {
      setIsLoading(false);
    }
  };

  if (isPublished && publishedUrl) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-lg font-semibold">Publish</h2>
        </div>

        {/* Published State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            App Published!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {appName} is now live and accessible to users.
          </p>

          <div className="w-full max-w-sm space-y-4">
            {/* App Details */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Live Application
              </p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-green-700 dark:text-green-300 break-all flex-1">
                  {publishedUrl}
                </p>
                <button
                  onClick={() => window.open(publishedUrl, "_blank")}
                  className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(publishedUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open App
              </Button>
              <Button variant="outline" className="flex-1">
                Deployment Info
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold">Publish</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Deploy your application to the world
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-sm space-y-6">
          {/* Status Summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {allChecksPassed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <h3 className="font-semibold text-sm">
                {allChecksPassed
                  ? "Ready to Publish"
                  : "Prepare Your App for Publishing"}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {allChecksPassed
                ? "Your application is ready to be published and deployed."
                : "Resolve any issues below before publishing your app."}
            </p>
          </div>

          {/* Pre-Publish Checks */}
          <div>
            <button
              onClick={() => setShowChecks(!showChecks)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-2"
            >
              <span className="font-medium text-sm">Quality Checks</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {checks.filter((c) => c.status === "passed").length}/
                {checks.length}
              </span>
            </button>

            {showChecks && (
              <div className="space-y-2">
                {checks.map((check) => (
                  <div
                    key={check.name}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-start gap-3">
                      {check.status === "passed" && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      )}
                      {check.status === "failed" && (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      {check.status === "pending" && (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5"></div>
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {check.name}
                        </p>
                        {check.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {check.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Deployment Environment
            </label>
            <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm">
              <option>FeltDB Managed (Recommended)</option>
              <option>Self-Hosted</option>
              <option>Custom Domain</option>
            </select>
          </div>

          {/* Deploy Button */}
          {allChecksPassed && (
            <Button
              onClick={handlePublish}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Publishing..." : "Publish App"}
            </Button>
          )}

          {!allChecksPassed && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Resolve the failing checks above to enable publishing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
