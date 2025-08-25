import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { TrpcProvider } from "./TrpcProvider.tsx";

// Lazy load notebook components
const NotebookViewer = React.lazy(() =>
  import("./notebook/NotebookViewer.tsx").then((m) => ({
    default: m.NotebookViewer,
  }))
);

export const NotebookApp: React.FC = () => {
  // Note: Auth token updates are handled via error detection and page reload
  // rather than dynamic sync payload updates, as LiveStore doesn't support
  // runtime sync payload changes

  return (
    <div className="bg-background min-h-screen">
      {/* Main Content */}
      <ErrorBoundary fallback={<div>Error loading notebook</div>}>
        <TrpcProvider>
          <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <NotebookViewer />
          </Suspense>
        </TrpcProvider>
      </ErrorBoundary>
    </div>
  );
};
