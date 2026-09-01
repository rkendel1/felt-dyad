import {
  selectedComponentsPreviewAtom,
  previewIframeRefAtom,
  visualEditingSelectedComponentAtom,
} from "@/atoms/previewAtoms";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Code2, X, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

interface SelectedComponentsDisplayProps {
  onEditWithAI?: () => void;
}

export function SelectedComponentsDisplay({
  onEditWithAI,
}: SelectedComponentsDisplayProps) {
  const [selectedComponents, setSelectedComponents] = useAtom(
    selectedComponentsPreviewAtom,
  );
  const previewIframeRef = useAtomValue(previewIframeRefAtom);
  const setVisualEditingSelectedComponent = useSetAtom(
    visualEditingSelectedComponentAtom,
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const handleRemoveComponent = (index: number) => {
    const componentToRemove = selectedComponents[index];
    const newComponents = selectedComponents.filter((_, i) => i !== index);
    setSelectedComponents(newComponents);
    setVisualEditingSelectedComponent(null);

    // Remove the specific overlay from the iframe
    if (previewIframeRef?.contentWindow) {
      previewIframeRef.contentWindow.postMessage(
        {
          type: "remove-dyad-component-overlay",
          componentId: componentToRemove.id,
        },
        "*",
      );
    }
  };

  const handleClearAll = () => {
    setSelectedComponents([]);
    setVisualEditingSelectedComponent(null);
    if (previewIframeRef?.contentWindow) {
      previewIframeRef.contentWindow.postMessage(
        { type: "clear-dyad-component-overlays" },
        "*",
      );
    }
  };

  const handleEditWithAI = () => {
    // Call the provided callback if available
    if (onEditWithAI) {
      onEditWithAI();
    } else {
      // Fallback: try to focus the chat input using a selector
      const chatInput = document.querySelector(
        '[data-testid="chat-input-content-editable"]',
      ) as HTMLElement;
      if (chatInput) {
        chatInput.focus();
      }
    }
  };

  if (!selectedComponents || selectedComponents.length === 0) {
    return null;
  }

  const count = selectedComponents.length;
  const countLabel = count === 1 ? "component" : `${count} components`;

  return (
    <div
      className="border-b border-border bg-purple-50 dark:bg-purple-950/20"
      data-testid="selected-component-display"
    >
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Selected
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
              {countLabel}
            </span>
          </div>
          <button
            onClick={handleClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Clear all selected components"
          >
            Clear all
          </button>
        </div>
        {isExpanded ? (
          <div className="space-y-2 max-h-[160px] overflow-y-auto mb-3">
            {selectedComponents.map((selectedComponent, index) => (
              <div
                key={selectedComponent.id}
                className="flex items-start justify-between rounded-md bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2 overflow-hidden flex-1">
                  <Code2
                    size={16}
                    className="flex-shrink-0 text-purple-600 dark:text-purple-400 mt-0.5"
                  />
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span
                      className="truncate font-semibold text-foreground"
                      title={selectedComponent.name}
                    >
                      {selectedComponent.name}
                    </span>
                    <span
                      className="truncate text-xs text-muted-foreground"
                      title={`${selectedComponent.relativePath}:${selectedComponent.lineNumber}`}
                    >
                      {selectedComponent.relativePath}:
                      {selectedComponent.lineNumber}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveComponent(index)}
                  className="ml-2 flex-shrink-0 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Deselect component"
                  aria-label={`Remove ${selectedComponent.name}`}
                >
                  <X
                    size={16}
                    className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                  />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 mb-3"
          >
            <ChevronDown size={14} />
            Show details
          </button>
        )}

        {/* Edit with AI Button */}
        <button
          onClick={handleEditWithAI}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium text-sm transition-colors"
          title="Focus chat input to edit selected components with AI"
        >
          <Sparkles size={16} />
          Edit with AI
        </button>
      </div>
    </div>
  );
}
