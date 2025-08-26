// import { toast } from "sonner";
import { useDebug } from "@/components/debug/debug-mode.js";
import { Button } from "@/components/ui/button";
import { queries } from "@/schema";
import { useQuery, useStore } from "@livestore/react";
import { Filter, X } from "lucide-react";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { UserProfile } from "../auth/UserProfile.js";
import { CollaboratorAvatars } from "../CollaboratorAvatars.js";
import { DebugModeToggle } from "../debug/DebugModeToggle.js";
import { RuntLogoSmall } from "../logo/RuntLogoSmall.js";
import { GitCommitHash } from "./GitCommitHash.js";
import { NotebookContent } from "./NotebookContent.js";
import { NotebookTitle } from "./NotebookTitle.js";
import { RuntimeHealthIndicatorButton } from "./RuntimeHealthIndicatorButton.js";
import { RuntimeHelper } from "./RuntimeHelper.js";
import { contextSelectionMode$ } from "./signals/ai-context.js";
import { KeyboardShortcuts } from "../KeyboardShortcuts.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("../debug/DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

export const NotebookViewer: React.FC = () => {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  const debug = useDebug();
  const { store } = useStore();

  // cells are already sorted by position from the database query
  const cellReferences = useQuery(queries.cellsWithIndices$);

  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);

  const contextSelectionMode = useQuery(contextSelectionMode$);

  return (
    <div className="bg-background min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-card border-b px-3 py-1 sm:px-4 sm:py-2">
        <div
          className={`flex w-full items-center justify-between ${debug.enabled ? "sm:mx-auto sm:max-w-none" : "sm:mx-auto sm:max-w-6xl"}`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <RuntLogoSmall />
            <a
              href={window.location.origin}
              className="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center justify-center rounded-md border px-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:px-3"
            >
              <span className="text-xs sm:text-sm">+ Notebook</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <CollaboratorAvatars />
            {import.meta.env.DEV && <DebugModeToggle />}
            <ErrorBoundary fallback={<div>Error loading user profile</div>}>
              <UserProfile />
            </ErrorBoundary>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={`flex ${debug.enabled ? "h-[calc(100vh-57px)]" : ""}`}>
        {/* Notebook Content */}
        <div
          className={`${debug.enabled ? "flex-1 overflow-y-auto" : "w-full"}`}
        >
          {/* Notebook Header Bar */}
          <div className="bg-muted/20 border-b">
            <div
              className={`w-full px-3 py-2 ${debug.enabled ? "px-4 py-3" : "sm:mx-auto sm:max-w-6xl sm:px-4 sm:py-3"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                  <NotebookTitle />
                </div>

                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                  <RuntimeHealthIndicatorButton
                    onToggleClick={() =>
                      setShowRuntimeHelper(!showRuntimeHelper)
                    }
                  />
                  <Button
                    variant={contextSelectionMode ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      store.setSignal(
                        contextSelectionMode$,
                        !contextSelectionMode
                      )
                    }
                    className="flex items-center gap-1 sm:gap-2"
                  >
                    {contextSelectionMode ? (
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="text-xs sm:text-sm">
                      {contextSelectionMode ? "Done" : "Context"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <RuntimeHelper
              notebookId={store.storeId}
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => setShowRuntimeHelper(false)}
            />
          </div>

          <div
            className={`w-full px-0 py-3 pb-24 ${debug.enabled ? "px-4" : "sm:mx-auto sm:max-w-4xl sm:p-4 sm:pb-4"}`}
          >
            {/* Keyboard Shortcuts Help - Desktop only */}
            {cellReferences.length > 0 && <KeyboardShortcuts />}

            {/* Cells */}
            <NotebookContent />
          </div>
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
              <LazyDebugPanel />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>
      <div className="h-[70vh]"></div>
      {/* Build info footer */}
      <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
        <GitCommitHash />
      </div>
    </div>
  );
};
