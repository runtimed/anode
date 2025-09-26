import { trpcQueryClient } from "@/lib/trpc-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Link2, Mail, Plus, Trash2, User } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import { toast } from "sonner";
import { getNotebookVanityUrl } from "../../util/url-utils";
import { useTrpc } from "../TrpcProvider";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Collaborator } from "./types";
import { cn } from "@/lib/utils";

interface SharingDialogProps {
  notebookId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const SharingDialog: React.FC<SharingDialogProps> = ({
  notebookId,
  isOpen,
  onOpenChange,
}) => {
  const trpc = useTrpc();

  // Query notebook data
  const {
    data: nb,
    isLoading,
    isRefetching,
  } = useQuery({
    ...trpc.notebook.queryOptions({ id: notebookId }),
    enabled: isOpen,
  });

  const canShare = true; // TODO: Check actual permission

  if (isLoading || !nb) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-md", isRefetching && "animate-pulse")}
      >
        <DialogHeader>
          <DialogTitle>Share Notebook</DialogTitle>
          <DialogDescription>
            Collaborate on "{nb.title || "Untitled Notebook"}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {canShare && <AddCollaborator notebookId={notebookId} />}
          <CurrentAccess>
            <OwnerItem notebookId={notebookId} />
            <Collaborators notebookId={notebookId} canShare={canShare} />
          </CurrentAccess>
        </div>
        <DialogFooter>
          <CopyLinkButton notebookId={notebookId} />
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function Collaborators({
  notebookId,
  canShare,
}: {
  notebookId: string;
  canShare: boolean;
}) {
  const trpc = useTrpc();

  const {
    data: collaborators,
    isLoading: isLoadingCollaborators,
    isRefetching: isRefetchingCollaborators,
  } = useQuery(trpc.notebookCollaborators.queryOptions({ nbId: notebookId }));

  if (
    !collaborators ||
    (collaborators.length === 0 && !isLoadingCollaborators)
  ) {
    return (
      <div className="rounded border-2 border-dashed border-gray-200 p-6 text-center">
        <div className="text-sm text-gray-500">No collaborators yet</div>
        {!canShare && (
          <div className="mt-1 text-xs text-gray-400">
            Only the owner can add collaborators
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2",
        (isLoadingCollaborators || isRefetchingCollaborators) && "animate-pulse"
      )}
    >
      {collaborators?.map((collaborator) => (
        <CollaboratorItem
          key={collaborator.id}
          notebookId={notebookId}
          collaborator={collaborator}
          canShare={canShare}
        />
      ))}
    </div>
  );
}

function AddCollaborator({ notebookId }: { notebookId: string }) {
  const trpc = useTrpc();

  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  // Debounce the email input with a 500ms delay
  useDebounce(() => setDebouncedEmail(email), 200, [email]);

  // Only lookup user if debounced email looks valid and not empty
  const shouldLookupUser =
    debouncedEmail.includes("@") && debouncedEmail.includes(".");

  // Query for user by email using debounced value
  const { data: userByEmail, isFetching: lookingUpUser } = useQuery({
    ...trpc.userByEmail.queryOptions({ email: debouncedEmail.trim() }),
    enabled: shouldLookupUser,
  });

  const foundUser = userByEmail;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-gray-500" />
        <label className="text-sm font-medium">Add collaborator</label>
      </div>

      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Enter email address..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />

        {/* User lookup results */}
        {shouldLookupUser && (
          <div className="rounded border bg-gray-50 p-3">
            {lookingUpUser ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Looking up user...
              </div>
            ) : foundUser ? (
              <FoundUserMessage
                foundUser={foundUser}
                notebookId={notebookId}
                onShare={() => setEmail("")}
              />
            ) : (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                <div>
                  <div>No user found with this email address.</div>
                  <div className="mt-1 text-xs text-gray-500">
                    They'll need to sign up for Runt first.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FoundUserMessage({
  foundUser,
  notebookId,
  onShare,
}: {
  foundUser: {
    id: string;
    givenName?: string | null;
    familyName?: string | null;
  };
  notebookId: string;
  onShare: () => void;
}) {
  const trpc = useTrpc();

  const { data: owner } = useQuery(
    trpc.notebookOwner.queryOptions({ nbId: notebookId })
  );

  const { data: collaborators } = useQuery(
    trpc.notebookCollaborators.queryOptions({ nbId: notebookId })
  );

  // Share notebook mutation
  const shareMutation = useMutation(trpc.shareNotebook.mutationOptions());

  const handleShare = async () => {
    if (
      !foundUser ||
      shareMutation.isPending ||
      isUserAlreadyCollaborator ||
      isOwnerTryingToShareWithSelf
    ) {
      return;
    }

    try {
      await shareMutation.mutateAsync({
        nbId: notebookId,
        userId: foundUser.id,
      });
      onShare();
      // Give chance for UI to update search before invalidating queries
      setTimeout(() => {
        trpcQueryClient.invalidateQueries();
      }, 200);
    } catch (error) {
      console.error("Failed to share notebook:", error);
      // TODO: Show error toast
    }
  };

  const isUserAlreadyCollaborator = useMemo(() => {
    if (!foundUser || !collaborators) return false;
    return collaborators.some((c) => c.id === foundUser.id);
  }, [foundUser, collaborators]);

  const isOwnerTryingToShareWithSelf = useMemo(() => {
    if (!foundUser || !owner) return false;
    return foundUser.id === owner.id;
  }, [foundUser, owner]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-green-600" />
        <span className="font-medium text-green-700">
          {formatUserName(foundUser)}
        </span>
      </div>

      {isOwnerTryingToShareWithSelf ? (
        <div className="flex items-start gap-2 text-sm text-amber-600">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>You are already the owner of this notebook</span>
        </div>
      ) : isUserAlreadyCollaborator ? (
        <div className="flex items-start gap-2 text-sm text-amber-600">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>This user is already a collaborator</span>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleShare}
          disabled={shareMutation.isPending}
          className="w-full"
        >
          <Plus className="mr-1 h-3 w-3" />
          {shareMutation.isPending ? "Adding..." : "Add as collaborator"}
        </Button>
      )}
    </div>
  );
}

function OwnerItem({ notebookId }: { notebookId: string }) {
  const trpc = useTrpc();

  const { data: owner } = useQuery(
    trpc.notebookOwner.queryOptions({ nbId: notebookId })
  );

  if (!owner) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded border bg-blue-50 p-3">
      <div className="font-medium">{formatUserName(owner)}</div>
      <Badge variant="default">Owner</Badge>
    </div>
  );
}

function CollaboratorItem({
  notebookId,
  collaborator,
  canShare,
}: {
  notebookId: string;
  collaborator: Collaborator;
  canShare: boolean;
}) {
  const trpc = useTrpc();

  const unshareMutation = useMutation(trpc.unshareNotebook.mutationOptions());

  const handleShareRemove = async (userId: string) => {
    try {
      await unshareMutation.mutateAsync({
        nbId: notebookId,
        userId,
      });
      trpcQueryClient.invalidateQueries();
    } catch (error) {
      console.error("Failed to unshare notebook:", error);
      toast.error("Failed to unshare notebook");
    }
  };

  return (
    <div
      key={collaborator.id}
      className={cn(
        "flex items-center justify-between rounded border bg-gray-50 p-3",
        unshareMutation.isPending && "animate-pulse"
      )}
    >
      <div>
        <div className="font-medium">{formatUserName(collaborator)}</div>
        <div className="text-xs text-gray-600">Can edit</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Writer</Badge>
        {canShare && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShareRemove(collaborator.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CurrentAccess({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500" />
        <label className="text-sm font-medium">Current access</label>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CopyLinkButton({ notebookId }: { notebookId: string }) {
  const trpc = useTrpc();

  const { data: notebook } = useQuery(
    trpc.notebook.queryOptions({ id: notebookId })
  );

  const handleCopyLink = async () => {
    try {
      const notebookUrl = getNotebookVanityUrl(notebookId, notebook?.title);
      const fullUrl = `${window.location.origin}${notebookUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button variant="outline" onClick={handleCopyLink}>
      <Link2 className="mr-1 h-3 w-3" />
      Copy link
    </Button>
  );
}

const formatUserName = (
  user?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null
) => {
  if (!user) return "";
  if (user.givenName && user.familyName) {
    return `${user.givenName} ${user.familyName}`;
  }
  return user.givenName || user.familyName;
};
