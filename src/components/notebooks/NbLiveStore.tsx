import { cn } from "@/lib/utils";
import React from "react";
import { KeyboardShortcuts } from "../KeyboardShortcuts.js";
import {
  LiveStoreReady,
  useLiveStoreReady,
} from "../livestore/LivestoreProviderProvider.js";
import { NotebookContent } from "../notebook/NotebookContent.js";
import { DelayedSpinner } from "../outputs/shared-with-iframe/SuspenseSpinner.js";
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
  const liveStoreReady = useLiveStoreReady();

  return (
    <LiveStoreSpinnerContainer liveStoreReady={liveStoreReady}>
      <LiveStoreReady>
        <div className="flex">
          <div className="container mx-auto px-4">
            <RuntimeHelper
              notebookId={id}
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => setShowRuntimeHelper(false)}
            />
            <KeyboardShortcuts />
            <NotebookContent />
          </div>
        </div>
      </LiveStoreReady>
    </LiveStoreSpinnerContainer>
  );
}

function LiveStoreSpinnerContainer({
  children,
  liveStoreReady,
}: {
  children: React.ReactNode;
  liveStoreReady: boolean;
}) {
  return (
    // Spinner is relative to this div
    <div className="relative">
      {children}

      {/* Loading spinner */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
          liveStoreReady ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="bg-background flex items-center justify-center rounded-full">
          <DelayedSpinner size="lg" />
        </div>
      </div>
    </div>
  );
}
