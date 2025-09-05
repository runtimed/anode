import { useDebug } from "@/components/debug/debug-mode";
import { cn } from "@/lib/utils";
import React, { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { CustomLiveStoreProvider } from "@/components/livestore/CustomLiveStoreProvider";
import { ContextSelectionModeButton } from "@/components/notebook/ContextSelectionModeButton";
import { NotebookContent } from "@/components/notebook/NotebookContent";
import { RuntimeHealthIndicatorButton } from "../notebook/RuntimeHealthIndicatorButton";
import { RuntimeHelper } from "@/components/notebook/RuntimeHelper";
import { DelayedSpinner } from "@/components/outputs/shared-with-iframe/SuspenseSpinner";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("../debug/DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

interface NotebookAppProps {
  notebookId: string;
  showRuntimeHelper: boolean;
  onToggleRuntimeHelper: () => void;
}

export const NotebookApp: React.FC<NotebookAppProps> = ({
  notebookId,
  showRuntimeHelper,
  onToggleRuntimeHelper,
}) => {
  const [liveStoreReady, setLiveStoreReady] = useState(false);
  const debug = useDebug();

  return (
    <LiveStoreSpinnerContainer liveStoreReady={liveStoreReady}>
      <CustomLiveStoreProvider
        storeId={notebookId}
        onLiveStoreReady={() => setLiveStoreReady(true)}
      >
        <div className="flex">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex h-8 items-center gap-3">
              <CollaboratorAvatars />
              <div className="flex-1" />
              <div className="flex items-center gap-2 text-sm">
                <ContextSelectionModeButton />
                <RuntimeHealthIndicatorButton
                  onToggleClick={onToggleRuntimeHelper}
                />
              </div>
            </div>
            <RuntimeHelper
              notebookId={notebookId}
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => onToggleRuntimeHelper()}
            />

            <KeyboardShortcuts />
            <NotebookContent />
          </div>

          {/* Debug Panel */}
          {import.meta.env.DEV && debug.enabled && (
            <Suspense
              fallback={
                <div className="bg-muted/5 text-muted-foreground w-96 border-l p-4 text-xs">
                  Loading debug panel...
                </div>
              }
            >
              <ErrorBoundary fallback={<div>Error rendering debug panel</div>}>
                <div className="w-96">
                  <LazyDebugPanel />
                </div>
              </ErrorBoundary>
            </Suspense>
          )}
        </div>
      </CustomLiveStoreProvider>
    </LiveStoreSpinnerContainer>
  );
};

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
