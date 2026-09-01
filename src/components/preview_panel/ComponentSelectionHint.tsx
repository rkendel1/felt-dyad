import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { useAtomValue } from "jotai";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";

/**
 * Empty-state hint shown when preview opens and no components are selected.
 * Disappears once the user has used the selection feature.
 */
export function ComponentSelectionHint() {
  const isPreviewOpen = useAtomValue(isPreviewOpenAtom);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasUsedFeature, setHasUsedFeature] = useState(false);

  // Mark feature as used when this mounts (meaning preview is open and user has seen the hint)
  useEffect(() => {
    if (isPreviewOpen && !isDismissed && !hasUsedFeature) {
      const timer = setTimeout(() => {
        setHasUsedFeature(true);
      }, 2000); // Show hint for 2 seconds before marking as used

      return () => clearTimeout(timer);
    }
  }, [isPreviewOpen, isDismissed, hasUsedFeature]);

  // Hide if already dismissed or feature has been used
  if (isDismissed || hasUsedFeature) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mx-2 mt-2 flex items-start gap-3">
      <Lightbulb
        size={18}
        className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          Want to change something?
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
          Click the <span className="font-semibold">Select</span> button, click
          a component in the preview, then describe what you'd like to change.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 transition-colors"
        aria-label="Dismiss hint"
      >
        <X size={16} />
      </button>
    </div>
  );
}
