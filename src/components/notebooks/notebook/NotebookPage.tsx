import { ArrowLeft, User, Users } from "lucide-react";
import React, { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useParams } from "react-router-dom";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { DebugModeToggle } from "../../debug/DebugModeToggle.js";
import { KeyboardShortcuts } from "../../KeyboardShortcuts.js";
import { CustomLiveStoreProvider } from "../../livestore/CustomLiveStoreProvider.js";
import { LoadingState } from "../../loading/LoadingState.js";
import { GitCommitHash } from "../../notebook/GitCommitHash.js";
import { NotebookContent } from "../../notebook/NotebookContent.js";
import { NotebookSidebar } from "../../notebook/NotebookSidebar.js";

import { Button } from "../../ui/button.js";
import { SharingModal } from "../SharingModal.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { useNavigateToCanonicalUrl, useNotebook } from "./helpers.js";
import { TitleEditor } from "./TitleEditor.js";

export const NotebookPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <div>No notebook id</div>;

  return (
    <CustomLiveStoreProvider storeId={id}>
      <NotebookPageWithId id={id} />
    </CustomLiveStoreProvider>
  );
};

function NotebookPageWithId({ id }: { id: string }) {
  const location = useLocation();
  // Get initial notebook data from router state (if navigated from creation)
  const initialNotebook = location.state?.initialNotebook as
    | NotebookProcessed
    | undefined;

  const { notebook, isLoading, error, refetch } = useNotebook(
    id,
    initialNotebook
  );

  if (isLoading && !initialNotebook) {
    return <LoadingState variant="fullscreen" message="Loading notebook..." />;
  }

  if (error || !notebook) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            {error ? "Error Loading Notebook" : "Notebook Not Found"}
          </h1>
          <p className="mb-6 text-gray-600">
            {error
              ? error.message
              : "The notebook you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Link to="/nb">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Notebooks
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NotebookPageWithIdAndNotebook
      id={id}
      notebook={notebook}
      refetch={refetch}
    />
  );
}

function NotebookPageWithIdAndNotebook({
  id,
  notebook,
  refetch,
}: {
  id: string;
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  useNavigateToCanonicalUrl(notebook);

  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const canEdit = notebook.myPermission === "OWNER";

  return (
    <div className="flex h-screen w-full">
      <NotebookSidebar
        notebook={notebook}
        notebookId={id}
        onUpdate={refetch}
        onAiPanelToggle={setIsAiPanelOpen}
      />

      <div
        className={`flex flex-1 flex-col transition-all duration-200 ${
          isAiPanelOpen ? "ml-[368px]" : "ml-12"
        }`}
      >
        {/* Header */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap-reverse items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <TitleEditor
                  notebook={notebook}
                  onTitleSaved={refetch}
                  canEdit={canEdit}
                />
              </div>

              {/* Right side - Simplified */}
              <div className="flex items-center gap-3">
                {import.meta.env.DEV && <DebugModeToggle />}
                <CollaboratorAvatars />

                <ErrorBoundary fallback={<div>Error loading user profile</div>}>
                  <SimpleUserProfile />
                </ErrorBoundary>
              </div>
            </div>

            {/* Metadata - Simplified */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                {/* Owner name without label */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span>
                    {notebook.owner?.givenName && notebook.owner?.familyName
                      ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                      : "Unknown Owner"}
                  </span>
                </div>

                {/* Collaborators count with share button */}
                {notebook.collaborators &&
                  notebook.collaborators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        <span>
                          {notebook.collaborators.length}{" "}
                          {notebook.collaborators.length === 1
                            ? "collaborator"
                            : "collaborators"}
                        </span>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSharingModalOpen(true)}
                          className="h-5 px-2 text-xs text-gray-400 hover:text-gray-600"
                        >
                          Share
                        </Button>
                      )}
                    </div>
                  )}

                {/* Show share button even when no collaborators */}
                {(!notebook.collaborators ||
                  notebook.collaborators.length === 0) &&
                  canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSharingModalOpen(true)}
                      className="h-5 px-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Users className="mr-1.5 h-3 w-3" />
                      Share
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4">
            <KeyboardShortcuts />
            <NotebookContent />
            <div className="h-[70vh]"></div>
            <div className="mt-8 flex justify-center border-t px-4 py-2 text-center">
              <GitCommitHash />
            </div>
          </div>
        </div>
      </div>

      {/* Sharing Modal */}
      <SharingModal
        notebook={notebook}
        isOpen={isSharingModalOpen}
        onClose={() => setIsSharingModalOpen(false)}
        onUpdate={refetch}
      />
    </div>
  );
}
