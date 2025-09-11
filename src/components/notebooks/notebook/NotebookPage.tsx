import { ArrowLeft, ArrowUp, User, Users } from "lucide-react";
import React, { RefObject, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Link, useLocation, useParams } from "react-router-dom";
import { useScroll } from "react-use";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";

import { CustomLiveStoreProvider } from "../../livestore/CustomLiveStoreProvider.js";
import { LoadingState } from "../../loading/LoadingState.js";

import { NotebookContent } from "../../notebook/NotebookContent.js";
import { NotebookSidebar } from "../../notebook/NotebookSidebar.js";

import { Button } from "../../ui/button.js";
import { SharingModal } from "../SharingModal.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { useNavigateToCanonicalUrl, useNotebook } from "./helpers.js";
import { TitleEditor } from "./TitleEditor.js";
import { useIsMobile } from "@/hooks/use-mobile.js";

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
    <NotebookPageWithIdAndNotebook notebook={notebook} refetch={refetch} />
  );
}

function NotebookPageWithIdAndNotebook({
  notebook,
  refetch,
}: {
  notebook: NotebookProcessed;
  refetch: () => void;
}) {
  useNavigateToCanonicalUrl(notebook);

  const isMobile = useIsMobile();
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const nbContentScrollRef = useRef<HTMLDivElement>(null);

  const canEdit = notebook.myPermission === "OWNER";

  const { y: scrollY } = useScroll(
    nbContentScrollRef as RefObject<HTMLElement>
  );
  const isScrolled = scrollY > 0;

  return (
    <div className="flex h-screen w-full">
      <NotebookSidebar
        notebook={notebook}
        onUpdate={refetch}
        onAiPanelToggle={setIsAiPanelOpen}
      />

      <div
        className={`flex flex-1 flex-col overflow-x-hidden pb-16 transition-all duration-200 lg:pb-0 ${
          isAiPanelOpen ? "lg:ml-[368px]" : "lg:ml-12"
        }`}
      >
        {/* Header */}
        <div className="border-b bg-white">
          <div className="mx-auto px-2 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-1 sm:gap-4">
              <div className="min-w-0 flex-1 overflow-hidden">
                <TitleEditor
                  notebook={notebook}
                  onTitleSaved={refetch}
                  canEdit={canEdit}
                />
              </div>

              {/* Right side - Mobile optimized */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                <div className="hidden sm:block">
                  <CollaboratorAvatars />
                </div>

                <ErrorBoundary fallback={<div>Error</div>}>
                  <SimpleUserProfile />
                </ErrorBoundary>
              </div>
            </div>

            {/* Metadata - Mobile optimized */}
            <div className="mt-2 flex flex-col gap-2 text-xs text-gray-500 sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Owner name - Mobile: Show on mobile with CollaboratorAvatars */}
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span className="truncate">
                    {notebook.owner?.givenName && notebook.owner?.familyName
                      ? `${notebook.owner.givenName} ${notebook.owner.familyName}`
                      : "Unknown Owner"}
                  </span>
                </div>

                {/* Mobile CollaboratorAvatars */}
                <div className="sm:hidden">
                  <CollaboratorAvatars />
                </div>

                {/* Collaborators count with share button - More compact on mobile */}
                {notebook.collaborators &&
                  notebook.collaborators.length > 0 && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <Users className="h-3 w-3" />
                        <span className="hidden sm:inline">
                          {notebook.collaborators.length}{" "}
                          {notebook.collaborators.length === 1
                            ? "collaborator"
                            : "collaborators"}
                        </span>
                        <span className="sm:hidden">
                          {notebook.collaborators.length}
                        </span>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsSharingModalOpen(true)}
                          className="h-5 px-1 text-xs text-gray-400 hover:text-gray-600 sm:px-2"
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
                      className="h-5 px-1 text-xs text-gray-400 hover:text-gray-600 sm:px-2"
                    >
                      <Users className="mr-1 h-3 w-3 sm:mr-1.5" />
                      <span className="hidden sm:inline">Share</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div ref={nbContentScrollRef} className="flex-1 overflow-auto">
          <div className="w-full max-w-full px-2 sm:container sm:mx-auto sm:max-w-none sm:px-4">
            <div className="max-w-full min-w-0 overflow-hidden">
              <NotebookContent />
            </div>
            <div className="h-[70vh]"></div>
          </div>
        </div>
        {isScrolled && !isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              nbContentScrollRef.current?.scrollTo({ top: 0 });
            }}
            className="bg-background/50 absolute right-4 bottom-4 bg-white/50 backdrop-blur-xs"
          >
            <ArrowUp />
          </Button>
        )}
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
