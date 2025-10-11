import { Share2, User, Users } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { CollaboratorAvatars } from "../../CollaboratorAvatars.js";
import { Collaborator } from "../types.js";

import { Button } from "../../ui/button.js";
import { SimpleUserProfile } from "../SimpleUserProfile.js";
import type { NotebookProcessed } from "../types.js";
import { TitleEditor } from "./TitleEditor.js";
import { DebugModeToggle } from "@/components/debug/DebugModeToggle.js";
import { useAuthenticatedUser } from "@/auth/index.js";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card.js";
import { Avatar } from "@/components/ui/avatar.js";
import { AvatarImage } from "@/components/ui/avatar.js";
import { AvatarFallback } from "@/components/ui/avatar.js";

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
  const userId = useAuthenticatedUser();

  const ownerName =
    notebook.owner?.givenName || notebook.owner?.familyName
      ? `${notebook.owner.givenName ?? ""} ${notebook.owner.familyName ?? ""}`.trim()
      : "Unknown Owner";

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
                  {userId !== notebook.owner?.id && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      <span className="truncate">{ownerName}</span>
                    </div>
                  )}

                  {notebook.collaborators &&
                    notebook.collaborators.length > 0 && (
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
  if (collaborators.length === 0) {
    return null;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
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
      </HoverCardTrigger>
      <HoverCardContent>
        {collaborators.map((collaborator) => (
          <div key={collaborator.id}>
            <span>{collaboratorToName(collaborator)}</span>
            <Avatar>
              <AvatarImage src={collaborator.picture} />
              <AvatarFallback>
                {collaboratorToName(collaborator).charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

function collaboratorToName(collaborator: Collaborator): string {
  return `${collaborator.givenName ?? ""} ${collaborator.familyName ?? ""}`.trim();
}
