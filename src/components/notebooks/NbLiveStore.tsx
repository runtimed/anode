import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { CollaboratorAvatars } from "../CollaboratorAvatars.js";
import { KeyboardShortcuts } from "../KeyboardShortcuts.js";
import { CustomLiveStoreProvider } from "../livestore/CustomLiveStoreProvider.js";
import { ContextSelectionModeButton } from "../notebook/ContextSelectionModeButton.js";
import { NotebookContent } from "../notebook/NotebookContent.js";
import { RuntimeHealthIndicatorButton } from "../notebook/RuntimeHealthIndicatorButton.js";
import { RuntimeHelper } from "../notebook/RuntimeHelper.js";
import { DelayedSpinner } from "../outputs/shared-with-iframe/SuspenseSpinner.js";

export function NbLiveStore({ id }: { id: string }) {
  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);
  const [liveStoreReady, setLiveStoreReady] = useState(false);

  return (
    <LiveStoreSpinnerContainer liveStoreReady={liveStoreReady}>
      <CustomLiveStoreProvider
        storeId={id}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      >
        <div className="flex">
          <div className="container mx-auto px-4">
            <div className="flex h-12 items-center gap-2">
              <CollaboratorAvatars />
              <div className="flex-1" />
              <ContextSelectionModeButton />
              <RuntimeHealthIndicatorButton
                onToggleClick={() => setShowRuntimeHelper(!showRuntimeHelper)}
              />
            </div>
            <RuntimeHelper
              notebookId={id}
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => setShowRuntimeHelper(false)}
            />

            <KeyboardShortcuts />
            <NotebookContent />
          </div>
        </div>
      </CustomLiveStoreProvider>
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
