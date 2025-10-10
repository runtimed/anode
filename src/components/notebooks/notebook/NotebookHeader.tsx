import { Share2, User, Users } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { Collaborator } from "../types.js";

import { Button } from "../../ui/button.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { TitleEditor } from "./TitleEditor.js";
import { DebugModeToggle } from "@/components/debug/DebugModeToggle.js";

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
      <div className="mx-auto p-2 pl-5 sm:p-2 sm:pl-5">
        <div className="flex items-center justify-start gap-1 sm:gap-4">
          <div className="min-w-0">
            <TitleEditor
              notebook={notebook}
              onTitleSaved={onTitleSaved}
              canEdit={canEdit}
            />
          </div>

          <div className="flex-1" />

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {notebook.collaborators && notebook.collaborators.length > 0 && (
              <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
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

                  <CollaboratorSection collaborators={notebook.collaborators} />
                </div>
              </div>
            )}
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

            <ErrorBoundary FallbackComponent={() => null}>
              <CollaboratorAvatars />
            </ErrorBoundary>

            {/* Debug Mode Toggle */}
            {import.meta.env.DEV && <DebugModeToggle />}

            <ErrorBoundary fallback={<div>Error</div>}>
              <SimpleUserProfile />
            </ErrorBoundary>
          </div>
        </div>

        {/* Metadata - Mobile optimized */}
      </div>
    </div>
  );
}

function CollaboratorSection({
  collaborators,
}: {
  collaborators: readonly Collaborator[];
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
    </>
  );
}
