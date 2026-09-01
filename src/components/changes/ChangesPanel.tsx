import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { ConversionAnalysisView } from "@/components/ConversionAnalysisView";

export function ChangesPanel() {
  const appId = useAtomValue(selectedAppIdAtom);

  if (!appId) {
    return <p className="text-sm text-muted-foreground">Select an app.</p>;
  }

  return <ConversionAnalysisView appId={appId} />;
}
