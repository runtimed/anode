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
import { Spinner } from "../ui/Spinner";
import { Collaborator } from "./types";

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
  const { data: nb, isLoading } = useQuery({
    ...trpc.notebook.queryOptions({ id: notebookId }),
    enabled: isOpen,
  });

  const canShare = true; // TODO: Check actual permission

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  if (isLoading || !nb) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Notebook</DialogTitle>
          <DialogDescription>
            Collaborate on "{nb.title || "Untitled Notebook"}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {canShare && <AddCollaborator notebookId={notebookId} />}
          <CurrentAccess canShare={canShare} notebookId={notebookId}>
            {nb.collaborators?.map((collaborator) => (
              <CollaboratorItem
                key={collaborator.id}
                notebookId={notebookId}
                collaborator={collaborator}
                canShare={canShare}
              />
            ))}
          </CurrentAccess>
        </div>
        <DialogFooter>
          <CopyLinkButton notebookId={notebookId} />
          <Button onClick={() => handleOpenChange(true)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
      // TODO: Show error toast
    }
  };

  return (
    <div
      key={collaborator.id}
      className="flex items-center justify-between rounded border bg-gray-50 p-3"
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

function CurrentAccess({
  canShare,
  children,
  notebookId,
}: {
  canShare: boolean;
  children: React.ReactNode;
  notebookId: string;
}) {
  const trpc = useTrpc();

  const { data: owner, isLoading: isLoadingOwner } = useQuery(
    trpc.notebookOwner.queryOptions({ nbId: notebookId })
  );

  const { data: collaborators, isLoading: isLoadingCollaborators } = useQuery(
    trpc.notebookCollaborators.queryOptions({ nbId: notebookId })
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-500" />
        <label className="text-sm font-medium">Current access</label>
      </div>

      <div className="space-y-2">
        {/* Owner */}
        <div className="flex items-center justify-between rounded border bg-blue-50 p-3">
          <div>
            <div className="font-medium">
              {isLoadingOwner ? "Loading..." : formatUserName(owner)}
            </div>
            <div className="text-xs text-gray-600">Owner</div>
          </div>
          <Badge variant="default">Owner</Badge>
        </div>

        {/* Collaborators */}
        {children}

        {isLoadingCollaborators && <Spinner />}

        {(!collaborators ||
          (collaborators.length === 0 && !isLoadingCollaborators)) && (
          <div className="rounded border-2 border-dashed border-gray-200 p-6 text-center">
            <div className="text-sm text-gray-500">No collaborators yet</div>
            {!canShare && (
              <div className="mt-1 text-xs text-gray-400">
                Only the owner can add collaborators
              </div>
            )}
          </div>
        )}
      </div>
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
