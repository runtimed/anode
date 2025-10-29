import { Share2, UserLock, Users } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { Collaborator } from "../types.js";

import { useAuthenticatedUser } from "@/auth/index.js";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { Button } from "../../ui/button.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { NotebookControls } from "./NotebookControls.js";
import { TitleEditor } from "./TitleEditor.js";
import { useTitle } from "react-use";

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

  useTitle(notebook.title || "Untitled Notebook");
  const userId = useAuthenticatedUser();

  const ownerName =
    notebook.owner?.givenName || notebook.owner?.familyName
      ? `${notebook.owner.givenName ?? ""} ${notebook.owner.familyName ?? ""}`.trim()
      : "Unknown Owner";

  const hasCollaborators =
    notebook.collaborators && notebook.collaborators.length > 0;

  return (
    <div className="border-b bg-white">
      <div className="mx-auto p-2 pl-2 sm:p-2 sm:pr-3 sm:pl-6">
        <div className="flex items-center justify-start gap-1 sm:gap-4">
          <div className="flex min-w-0 flex-col md:flex-row md:gap-3">
            <TitleEditor
              notebook={notebook}
              onTitleSaved={onTitleSaved}
              canEdit={canEdit}
            />
            {hasCollaborators && (
              <div className="flex flex-col gap-2 pl-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* Owner name - Mobile: Show on mobile with CollaboratorAvatars */}
                  {userId !== notebook.owner?.id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <UserLock className="h-3 w-3" />
                          <span className="truncate">{ownerName}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Owner</TooltipContent>
                    </Tooltip>
                  )}

                  {/* If user can edit, we show a button instead of a metadata item */}
                  {!canEdit && (
                    <CollaboratorSection
                      collaborators={notebook.collaborators}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Right side */}

          <div className="flex shrink-0 items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSharingDialogOpen(true)}
                className="px-1 text-xs sm:px-2"
              >
                {hasCollaborators ? (
                  <>
                    <CollaboratorSection
                      collaborators={notebook.collaborators}
                    />
                  </>
                ) : (
                  <>
                    <Share2 />
                    <span className="sr-only sm:not-sr-only">Share</span>
                  </>
                )}
              </Button>
            )}

            <ErrorBoundary FallbackComponent={() => null}>
              <CollaboratorAvatars />
            </ErrorBoundary>

            <NotebookControls notebook={notebook} />

            <ErrorBoundary fallback={<div>Error</div>}>
              <SimpleUserProfile />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollaboratorSection({
  collaborators,
}: {
  collaborators: readonly Collaborator[];
}) {
  if (collaborators.length === 0) {
    return null;
  }

  const LIMIT = 10;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent>
        {collaborators.slice(0, LIMIT).map((collaborator) => (
          <div key={collaborator.id}>
            <span>{collaboratorToName(collaborator)}</span>
          </div>
        ))}
        {collaborators.length > LIMIT && (
          <div>
            <span>+{collaborators.length - LIMIT} more</span>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function collaboratorToName(collaborator: Collaborator): string {
  return `${collaborator.givenName ?? ""} ${collaborator.familyName ?? ""}`.trim();
}
