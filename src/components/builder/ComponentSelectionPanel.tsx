import { useAtomValue, useSetAtom } from "jotai";
import { visualEditingSelectedComponentAtom } from "@/atoms/previewAtoms";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Zap, X } from "lucide-react";

/**
 * ComponentSelectionPanel - PR11 Phase 3
 *
 * Allows users to:
 * 1. See which component is selected in the preview
 * 2. Click "Edit with AI" to describe changes
 * 3. Submit AI prompt to modify the component
 */
export function ComponentSelectionPanel() {
  const selectedComponent = useAtomValue(visualEditingSelectedComponentAtom);
  const setSelectedComponent = useSetAtom(visualEditingSelectedComponentAtom);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedComponent) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click on any component in the preview to select it, then use "Edit
          with AI" to make changes.
        </p>
      </div>
    );
  }

  const handleEditWithAI = () => {
    setShowEditDialog(true);
    setEditPrompt("");
  };

  const handleSubmitEdit = async () => {
    if (!editPrompt.trim()) return;

    try {
      setIsSubmitting(true);
      // TODO: Integrate with AI building system
      // This would call the AI to modify the selected component
      console.log("Edit prompt:", editPrompt);
      console.log("Selected component:", selectedComponent);

      // For now, just close the dialog
      setShowEditDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100">
              {selectedComponent.displayName || "Component"}
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              ID: {selectedComponent.id}
            </p>
          </div>
          <button
            onClick={() => setSelectedComponent(null)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          >
            <X className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>

        {/* Component Info */}
        <div className="space-y-2 mb-4">
          {selectedComponent.className && (
            <div className="text-xs">
              <span className="font-semibold text-blue-800 dark:text-blue-200">
                Class:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300 font-mono">
                {selectedComponent.className}
              </span>
            </div>
          )}
          {selectedComponent.tagName && (
            <div className="text-xs">
              <span className="font-semibold text-blue-800 dark:text-blue-200">
                Tag:
              </span>
              <span className="ml-2 text-blue-700 dark:text-blue-300 font-mono">
                {selectedComponent.tagName}
              </span>
            </div>
          )}
        </div>

        {/* Edit with AI Button */}
        <Button
          onClick={handleEditWithAI}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-2" />
          Edit with AI
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit with AI</DialogTitle>
            <DialogDescription>
              Describe what you want to change about{" "}
              <span className="font-semibold">
                {selectedComponent.displayName || "this component"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder={`Examples:\n- "Make this button red"\n- "Add hover effect"\n- "Change text size to large"\n- "Add border around this"`}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="min-h-[120px]"
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitEdit}
                disabled={!editPrompt.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Editing..." : "Edit Component"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
