import { KeyboardShortcuts } from "../KeyboardShortcuts.js";
import { LiveStoreReady } from "../livestore/LivestoreProviderProvider.js";
import { NotebookContent } from "../notebook/NotebookContent.js";
import { RuntimeHelper } from "../notebook/RuntimeHelper.js";

export function NbLiveStore({
  id,
  showRuntimeHelper,
  setShowRuntimeHelper,
}: {
  id: string;
  showRuntimeHelper: boolean;
  setShowRuntimeHelper: (showRuntimeHelper: boolean) => void;
}) {
  return (
    <LiveStoreReady>
      <div className="container mx-auto px-4">
        <RuntimeHelper
          notebookId={id}
          showRuntimeHelper={showRuntimeHelper}
          onClose={() => setShowRuntimeHelper(false)}
        />
        <KeyboardShortcuts />
        <NotebookContent />
      </div>
    </LiveStoreReady>
  );
}
