import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { SidebarPanelProps } from "./types";

// Lazy import DebugPanel only in development
const LazyDebugPanel = React.lazy(() =>
  import("@/components/debug/DebugPanel").then((module) => ({
    default: module.DebugPanel,
  }))
);

export const DebugPanel: React.FC<SidebarPanelProps> = () => {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="h-full">
      <div className="mb-3">
        <p className="text-xs text-gray-500">
          LiveStore database debugging and inspection tools.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="p-4 text-xs text-gray-500">
            Loading debug panel...
          </div>
        }
      >
        <ErrorBoundary
          fallback={
            <div className="text-sm text-red-500">
              Error rendering debug panel
            </div>
          }
        >
          <div className="w-full max-w-full overflow-hidden">
            <LazyDebugPanel />
          </div>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};
