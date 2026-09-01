import { useState } from "react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, HelpCircle, MessageCircle } from "lucide-react";
import { applicationIntelligenceClient } from "@/ipc/types/application-intelligence-contracts";
import { queryKeys } from "@/lib/queryKeys";

interface AskAboutAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AskAboutAppDialog({
  open,
  onOpenChange,
}: AskAboutAppDialogProps) {
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get application intelligence for context
  const { data: intelligence } = useQuery({
    queryKey: selectedAppId
      ? queryKeys.applicationIntelligence.detail({ appId: selectedAppId })
      : (["app-intelligence"] as const),
    queryFn: async () => {
      if (!selectedAppId) return null;
      return await applicationIntelligenceClient.get({ appId: selectedAppId });
    },
    enabled: !!selectedAppId && open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !intelligence || isLoading) return;

    // Add user message
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      // Generate answer based on application intelligence
      const answer = generateAnswer(userMessage, intelligence);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error answering your question.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput("");
    onOpenChange(false);
  };

  // Suggested questions based on application context
  const suggestedQuestions = getSuggestedQuestions(intelligence);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask About Your App
          </DialogTitle>
          <DialogDescription>
            Ask questions about your application's structure, data flow, and
            relationships
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px]">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-6">
                  Ask about your application's structure and relationships
                </p>
              </div>

              {suggestedQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Suggested questions
                  </p>
                  <div className="grid gap-2">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(question);
                        }}
                        className="text-left p-3 rounded-lg border border-border hover:bg-muted hover:border-muted-foreground transition-colors cursor-pointer"
                      >
                        <p className="text-sm text-foreground">{question}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={
                  message.role === "user"
                    ? "bg-primary text-primary-foreground max-w-[80%]"
                    : "bg-muted max-w-[80%]"
                }
              >
                <CardContent className="pt-3">
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-muted">
                <CardContent className="pt-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Thinking...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Ask about your application..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generate an answer to a question about the application based on the intelligence data
 */
function generateAnswer(question: string, intelligence: any): string {
  const q = question.toLowerCase();

  // Question patterns
  if (
    q.includes("where") &&
    (q.includes("data") || q.includes("information") || q.includes("come from"))
  ) {
    // "Where does customer information come from?"
    if (intelligence.collections && intelligence.collections.length > 0) {
      const collections = intelligence.collections
        .map((c: any) => c.name)
        .join(", ");
      return `Application data is organized in FeltDB collections:\n\n${collections}\n\nEach collection stores related records and is used by multiple components throughout the app.`;
    }
  }

  if (q.includes("affect") || q.includes("impact")) {
    // "What gets affected if I change X?"
    if (intelligence.components && intelligence.collections) {
      return `When you make changes to collections, they propagate to all components that read from those collections. Your app has ${intelligence.components.length} components connected to ${intelligence.collections.length} data collections.`;
    }
  }

  if (q.includes("feature") || q.includes("how is")) {
    // "How is X feature built?"
    if (intelligence.features && intelligence.features.length > 0) {
      const feature = intelligence.features[0];
      return `The "${feature.name}" feature is built using:\n\n• Components: Multiple UI elements working together\n• Collections: Data persistence in FeltDB\n• External Services: Potential integrations\n\nThis modular approach allows for easy maintenance and updates.`;
    }
  }

  if (
    q.includes("external") ||
    q.includes("service") ||
    q.includes("integration")
  ) {
    // "What external services are connected?"
    if (
      intelligence.externalServices &&
      intelligence.externalServices.length > 0
    ) {
      const services = intelligence.externalServices
        .map((s: any) => s.name)
        .join(", ");
      return `Your application is connected to these external services:\n\n${services}\n\nThese integrations handle specialized functionality like payments, authentication, and storage.`;
    }
  }

  if (q.includes("component") || q.includes("what is")) {
    // "What is the X component?"
    if (intelligence.components && intelligence.components.length > 0) {
      const comp = intelligence.components[0];
      return `"${comp.name}" is a UI component that:\n\n• Renders on specific pages\n• Reads from application state\n• May perform server actions\n• Is part of the "${intelligence.features?.[0]?.name || "application"}" feature\n\nIt's defined in: ${comp.sourceFile}`;
    }
  }

  if (q.includes("relationship") || q.includes("connected")) {
    // "How are X and Y related?"
    if (intelligence.components && intelligence.collections) {
      return `Components and data are tightly connected:\n\n• ${intelligence.components.length} Components read from\n• ${intelligence.collections.length} Collections\n\nThis architecture ensures data consistency and makes it easy to understand what affects what.`;
    }
  }

  if (q.includes("recent") || q.includes("change")) {
    // "What changed recently?"
    if (intelligence.changes && intelligence.changes.length > 0) {
      const recent = intelligence.changes.slice(0, 3);
      const changes = recent.map((c: any) => `• ${c.request}`).join("\n");
      return `Recent changes to your application:\n\n${changes}`;
    }
  }

  // Default answer
  return `I can help you understand:\n\n• Where your application data comes from\n• What components make up each feature\n• What happens when you change specific data\n• How external services are integrated\n• Recent changes to your app\n\nTry asking "Where does customer information come from?" or "What gets affected if I change the status field?"`;
}

/**
 * Generate suggested questions based on application context
 */
function getSuggestedQuestions(intelligence: any | null): string[] {
  if (!intelligence) return [];

  const questions: string[] = [];

  // Feature-based questions
  if (intelligence.features && intelligence.features.length > 0) {
    const feature = intelligence.features[0];
    questions.push(`How is the "${feature.name}" feature built?`);
  }

  // Data-based questions
  if (intelligence.collections && intelligence.collections.length > 0) {
    const collection = intelligence.collections[0];
    questions.push(`Where does ${collection.name} data come from?`);
  }

  // Service-based questions
  if (
    intelligence.externalServices &&
    intelligence.externalServices.length > 0
  ) {
    questions.push("What external services are connected?");
  }

  // Component-based questions
  if (intelligence.components && intelligence.components.length > 0) {
    questions.push("What components make up this application?");
  }

  // Change-based questions
  if (intelligence.changes && intelligence.changes.length > 0) {
    questions.push("What changed recently?");
  }

  // Generic questions
  if (questions.length < 3) {
    questions.push("Where does my application data come from?");
    questions.push("What gets affected if I change a collection?");
  }

  return questions.slice(0, 4); // Return max 4 suggestions
}
