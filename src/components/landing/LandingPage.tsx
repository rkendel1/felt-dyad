import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { ipc } from "@/ipc/types";
import { generateCuteAppName } from "@/lib/utils";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useSettings } from "@/hooks/useSettings";
import { usePostHog } from "posthog-js/react";
import { showError } from "@/lib/toast";
import {
  Sparkles,
  FileUp,
  FolderOpen,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportAppDialog } from "@/components/ImportAppDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { INSPIRATION_PROMPTS } from "@/prompts/inspiration_prompts";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAppQuery } from "@/hooks/useLoadApp";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";

interface LandingPageProps {
  existingApps?: Array<{ id: number; name: string }>;
}

type CreationPath = "create" | "import" | "continue" | null;

export function LandingPage({ existingApps = [] }: LandingPageProps) {
  const navigate = useNavigate();
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);
  const [selectedPath, setSelectedPath] = useState<CreationPath>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { refreshApps } = useLoadApps();
  const { streamMessage } = useStreamChat({ hasChatId: false });
  const { settings } = useSettings();
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  // Get random prompts
  const [randomPrompts, setRandomPrompts] = useState<
    typeof INSPIRATION_PROMPTS
  >([]);

  useEffect(() => {
    const shuffled = [...INSPIRATION_PROMPTS].sort(() => 0.5 - Math.random());
    setRandomPrompts(shuffled.slice(0, 3));
  }, []);

  const handleCreateApp = async (description: string) => {
    if (!description.trim()) return;

    try {
      setIsLoading(true);
      setSelectedPath(null);

      // Create the app
      const result = await ipc.app.createApp({
        name: generateCuteAppName(),
      });

      // Stream the message
      streamMessage({
        prompt: description,
        chatId: result.chatId,
        attachments: [],
      });

      // Give the app time to start
      await new Promise((resolve) =>
        setTimeout(resolve, settings?.isTestMode ? 0 : 2000),
      );

      setSelectedAppId(result.app.id);
      setIsPreviewOpen(false);
      await refreshApps();
      await invalidateAppQuery(queryClient, { appId: result.app.id });
      posthog.capture("landing:create-app");
      navigate({ to: "/chat", search: { id: result.chatId } });
    } catch (error) {
      console.error("Failed to create app:", error);
      showError("Failed to create app. " + (error as any).toString());
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-24 h-24">
            <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Building your app
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            We're setting up your app with AI magic. This might take a moment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FeltDB Builder
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Build applications with AI. Your application state is built in.
            </p>
          </div>

          {/* Three Paths */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Create Path */}
            <div
              onClick={() => setSelectedPath("create")}
              className={`p-8 rounded-lg border-2 transition-all cursor-pointer ${
                selectedPath === "create"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600"
              }`}
            >
              <div className="flex items-start gap-4">
                <Sparkles className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Create</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Describe what you want to build and let AI create it for
                    you.
                  </p>
                  {selectedPath === "create" && (
                    <div className="mt-4 flex gap-2">
                      <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-blue-600">
                        Ready to create
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Import Path */}
            <div
              onClick={() => setIsImportDialogOpen(true)}
              className="p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <FileUp className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Import</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Import an existing app from GitHub or your computer.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <ArrowRight className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-purple-600">
                      Choose import method
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Path */}
            <div
              onClick={() => setSelectedPath("continue")}
              className={`p-8 rounded-lg border-2 transition-all cursor-pointer ${
                existingApps.length > 0
                  ? selectedPath === "continue"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-default opacity-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <FolderOpen className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Continue</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {existingApps.length > 0
                      ? "Open an existing app and continue building."
                      : "No existing apps yet. Create or import one to start."}
                  </p>
                  {existingApps.length > 0 && selectedPath === "continue" && (
                    <div className="mt-4 flex gap-2">
                      <ArrowRight className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-600">
                        {existingApps.length} app
                        {existingApps.length !== 1 ? "s" : ""} available
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Inspiration Prompts */}
          {selectedPath === "create" && (
            <div className="mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Need inspiration? Try one of these ideas:
              </p>
              <div className="flex flex-wrap gap-2">
                {randomPrompts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleCreateApp(`Build me a ${item.label}`)}
                    className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create App Dialog */}
          {selectedPath === "create" && (
            <CreateAppDialog
              onClose={() => setSelectedPath(null)}
              onSubmit={handleCreateApp}
              isOpen={true}
            />
          )}

          {/* Continue Apps Dialog */}
          {selectedPath === "continue" && existingApps.length > 0 && (
            <ContinueAppDialog
              apps={existingApps}
              onClose={() => setSelectedPath(null)}
              onSelect={(appId) => {
                setSelectedAppId(appId);
                navigate({ to: "/chat", search: { id: undefined } });
              }}
              isOpen={true}
            />
          )}

          {/* Import Dialog */}
          <ImportAppDialog
            isOpen={isImportDialogOpen}
            onClose={() => setIsImportDialogOpen(false)}
          />
        </div>
      </div>
    </>
  );
}

interface CreateAppDialogProps {
  onClose: () => void;
  onSubmit: (description: string) => Promise<void>;
  isOpen: boolean;
}

function CreateAppDialog({ onClose, onSubmit, isOpen }: CreateAppDialogProps) {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    try {
      await onSubmit(description);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>What do you want to build?</DialogTitle>
          <DialogDescription>
            Describe your application and we'll create it for you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="A CRM for my consulting business..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-24"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!description.trim() || isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Build my app
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContinueAppDialogProps {
  apps: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSelect: (appId: number) => void;
  isOpen: boolean;
}

function ContinueAppDialog({
  apps,
  onClose,
  onSelect,
  isOpen,
}: ContinueAppDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Open an existing app</DialogTitle>
          <DialogDescription>
            Choose an app to continue working on.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => onSelect(app.id)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="font-medium">{app.name}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
