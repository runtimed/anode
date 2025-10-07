import { Share2, User, Users } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { Collaborator } from "../types.js";

import { Button } from "../../ui/button.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { NotebookControls } from "./NotebookControls.js";
import { TitleEditor } from "./TitleEditor.js";

export function NotebookHeader({
  notebook,
  onTitleSaved,
  setIsSharingDialogOpen,
}: {
  notebook: NotebookProcessed;
  onTitleSaved: () => void;
  setIsSharingDialogOpen: (isOpen: boolean) => void;
}) {
  const canEdit = notebook.myPermission === "OWNER";

  return (
    <div className="border-b bg-white">
      <div className="mx-auto px-2 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-1 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TitleEditor
              notebook={notebook}
              onTitleSaved={onTitleSaved}
              canEdit={canEdit}
            />
          </div>

          {/* Right side - Mobile optimized */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <ErrorBoundary FallbackComponent={() => null}>
                <CollaboratorAvatars />
              </ErrorBoundary>
            </div>

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSharingDialogOpen(true)}
                className="px-1 text-xs sm:px-2"
              >
                <Share2 />
                <span className="sr-only sm:not-sr-only">Share</span>
              </Button>
            )}

            <ErrorBoundary fallback={<div>Error</div>}>
              <SimpleUserProfile />
            </ErrorBoundary>
          </div>
        </div>

        {/* Metadata - Mobile optimized */}
        <div className="mt-2 flex flex-col gap-2 text-xs sm:mt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-gray-500 sm:gap-4">
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
              <ErrorBoundary FallbackComponent={() => null}>
                <CollaboratorAvatars />
              </ErrorBoundary>
            </div>

            <CollaboratorSection
              collaborators={notebook.collaborators}
              canEdit={canEdit}
              setIsSharingDialogOpen={() => setIsSharingDialogOpen(true)}
            />
          </div>
          <NotebookControls />
        </div>
      </div>
    </div>
  );
}

function CollaboratorSection({
  collaborators,
  canEdit,
  setIsSharingDialogOpen,
}: {
  collaborators: readonly Collaborator[];
  canEdit: boolean;
  setIsSharingDialogOpen: (isOpen: boolean) => void;
}) {
  return (
    <>
      {/* Collaborators count with share button - More compact on mobile */}
      {collaborators && collaborators.length > 0 && (
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">
              {collaborators.length}{" "}
              {collaborators.length === 1 ? "collaborator" : "collaborators"}
            </span>
            <span className="sm:hidden">{collaborators.length}</span>
          </div>
        </div>
      )}

      {/* Show share button even when no collaborators */}
      {(!collaborators || collaborators.length === 0) && canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSharingDialogOpen(true)}
          className="h-5 px-1 text-xs text-gray-400 hover:text-gray-600 sm:px-2"
        >
          <Users className="mr-1 h-3 w-3 sm:mr-1.5" />
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">+</span>
        </Button>
      )}
    </>
  );
}
