// import { toast } from "sonner";
import { queries, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";

import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { NotebookTitle } from "./NotebookTitle.js";

import { Avatar } from "@/components/ui/Avatar.js";
import { Button } from "@/components/ui/button";

import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { useAuthenticatedUser } from "../../auth/index.js";

import { getClientColor, getClientTypeInfo } from "@/services/userTypes.js";

import { Filter, X } from "lucide-react";
import { UserProfile } from "../auth/UserProfile.js";
import { RuntimeHealthIndicatorButton } from "./RuntimeHealthIndicatorButton.js";
import { RuntimeHelper } from "./RuntimeHelper.js";
import { contextSelectionMode$ } from "./signals/ai-context.js";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("../debug/DebugPanel.js").then((module) => ({
    default: module.DebugPanel,
  }))
);

import { useDebug } from "@/components/debug/debug-mode.js";
import { DebugModeToggle } from "../debug/DebugModeToggle.js";
import { GitCommitHash } from "./GitCommitHash.js";
import { NotebookContent } from "./NotebookContent.js";
import { RuntLogoSmall } from "../logo/RuntLogoSmall.js";

export const NotebookViewer: React.FC = () => {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";

  const debug = useDebug();
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuthenticatedUser();
  const { presentUsers, getUserInfo, getUserColor } = useUserRegistry();
  const cellReferences = useQuery(queries.cellsWithIndices$);

  const runtimeSessions = useQuery(
    queryDb(tables.runtimeSessions.select().where({ isActive: true }))
  );

  const [showRuntimeHelper, setShowRuntimeHelper] = React.useState(false);

  const contextSelectionMode = useQuery(contextSelectionMode$);

  // cells are already sorted by position from the database query

  const otherUsers = presentUsers.filter((user) => user.id !== userId);
  const LIMIT = 5;

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

          <div className="group/users flex items-center gap-2">
            <div className="flex -space-x-2 group-hover/users:space-x-1">
              {otherUsers.slice(0, LIMIT).map((user) => {
                const userInfo = getUserInfo(user.id);
                const clientInfo = getClientTypeInfo(user.id);
                const IconComponent = clientInfo.icon;

                return (
                  <div
                    key={user.id}
                    className="shrink-0 overflow-hidden rounded-full border-2 transition-[margin]"
                    style={{
                      borderColor: getClientColor(user.id, getUserColor),
                    }}
                    title={
                      clientInfo.type === "user"
                        ? (userInfo?.name ?? "Unknown User")
                        : clientInfo.name
                    }
                  >
                    {IconComponent ? (
                      <div
                        className={`flex size-8 items-center justify-center rounded-full ${clientInfo.backgroundColor}`}
                      >
                        <IconComponent
                          className={`size-4 ${clientInfo.textColor}`}
                        />
                      </div>
                    ) : userInfo?.picture ? (
                      <img
                        src={userInfo.picture}
                        alt={userInfo.name ?? "User"}
                        className="h-8 w-8 rounded-full bg-gray-300"
                      />
                    ) : (
                      <Avatar
                        initials={
                          userInfo?.name?.charAt(0).toUpperCase() ?? "?"
                        }
                        backgroundColor={getUserColor(user.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {otherUsers.length > LIMIT && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">
                  +{otherUsers.length - LIMIT}
                </span>
              </div>
            )}
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
              showRuntimeHelper={showRuntimeHelper}
              onClose={() => setShowRuntimeHelper(false)}
              runtimeSessions={runtimeSessions as any[]}
            />
          </div>

          <div
            className={`w-full px-0 py-3 pb-24 ${debug.enabled ? "px-4" : "sm:mx-auto sm:max-w-4xl sm:p-4 sm:pb-4"}`}
          >
            {/* Keyboard Shortcuts Help - Desktop only */}
            {cellReferences.length > 0 && (
              <div className="mb-6 hidden sm:block">
                <div className="bg-muted/30 rounded-md px-4 py-2">
                  <div className="text-muted-foreground flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ↑↓
                      </kbd>
                      <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ⇧↵
                      </kbd>
                      <span>Run & next</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="bg-background rounded border px-1.5 py-0.5 font-mono text-xs">
                        ⌘↵
                      </kbd>
                      <span>Run</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
