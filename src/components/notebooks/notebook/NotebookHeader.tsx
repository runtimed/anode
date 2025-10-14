import { CopyPlus, Share2, User, Users } from "lucide-react";
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
import { TitleEditor } from "./TitleEditor.js";
import { useTitle } from "react-use";
import { useDuplicateNotebook } from "../../../hooks/useDuplicateNotebook.js";
import { useConfirm } from "@/components/ui/confirm.js";
import { toast } from "sonner";

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
  const { duplicateNotebook, isDuplicating } = useDuplicateNotebook();
  const { confirm } = useConfirm();

  const handleDuplicateNotebook = async () => {
    confirm({
      title: "Duplicate Notebook",
      description: `Please confirm that you want to duplicate "${notebook.title || "Untitled Notebook"}".`,
      onConfirm: handleDuplicateNotebookConfirm,
      nonDestructive: true,
    });
  };

  const handleDuplicateNotebookConfirm = async () => {
    try {
      await duplicateNotebook(notebook.title || "Untitled Notebook");
    } catch (error) {
      toast.error("Failed to duplicate notebook");
    }
  };
  const userId = useAuthenticatedUser();

  const ownerName =
    notebook.owner?.givenName || notebook.owner?.familyName
      ? `${notebook.owner.givenName ?? ""} ${notebook.owner.familyName ?? ""}`.trim()
      : "Unknown Owner";

  const hasCollaborators =
    notebook.collaborators && notebook.collaborators.length > 0;

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

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="px-1 text-xs sm:px-2"
              onClick={handleDuplicateNotebook}
              disabled={isDuplicating}
            >
              <CopyPlus className="h-3 w-3" />
              <span className="sr-only sm:not-sr-only">
                {isDuplicating ? "Duplicating..." : "Duplicate Notebook"}
              </span>
              <span className="sm:hidden">
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </span>
            </Button>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {hasCollaborators && (
                <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* Owner name - Mobile: Show on mobile with CollaboratorAvatars */}
                    {userId !== notebook.owner?.id && (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="truncate">{ownerName}</span>
                      </div>
                    )}

                    {!canEdit && (
                      <CollaboratorSection
                        collaborators={notebook.collaborators}
                      />
                    )}
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

              <ErrorBoundary fallback={<div>Error</div>}>
                <SimpleUserProfile />
              </ErrorBoundary>
            </div>
          </div>

          {/* Metadata - Mobile optimized */}
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
