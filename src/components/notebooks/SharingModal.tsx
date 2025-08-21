import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Mail, Plus, Trash2, User } from "lucide-react";
import React, { useMemo, useState } from "react";
import { trpc } from "../../lib/trpc-client";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

interface SharingModalProps {
  runbook: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const SharingModal: React.FC<SharingModalProps> = ({
  runbook,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [email, setEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Only lookup user if email looks valid and not empty
  const shouldLookupUser = email.includes("@") && email.includes(".");

  // Query for user by email
  const { data: userByEmail, isFetching: lookingUpUser } = useQuery({
    ...trpc.userByEmail.queryOptions({ email: email.trim() }),
    enabled: shouldLookupUser,
  });

  // Query for notebook owner
  const { data: owner } = useQuery(
    trpc.notebookOwner.queryOptions({ notebookUlid: runbook.ulid })
  );

  // Query for notebook collaborators
  const { data: collaborators, refetch: refetchCollaborators } = useQuery(
    trpc.notebookCollaborators.queryOptions({ notebookUlid: runbook.ulid })
  );

  // Share notebook mutation
  const shareMutation = useMutation(trpc.shareNotebook.mutationOptions());

  // Unshare notebook mutation
  const unshareMutation = useMutation(trpc.unshareNotebook.mutationOptions());

  const foundUser = userByEmail;
  const isUserAlreadyCollaborator = useMemo(() => {
    if (!foundUser || !collaborators) return false;
    return collaborators.some((c: any) => c.id === foundUser.id);
  }, [foundUser, collaborators]);

  const isOwnerTryingToShareWithSelf = useMemo(() => {
    if (!foundUser || !owner) return false;
    return foundUser.id === owner.id;
  }, [foundUser, owner]);

  const canShare = true; // TODO: Check actual permission

  const handleShare = async () => {
    if (
      !foundUser ||
      isSharing ||
      isUserAlreadyCollaborator ||
      isOwnerTryingToShareWithSelf
    ) {
      return;
    }

    setIsSharing(true);
    try {
      await shareMutation.mutateAsync({
        notebookUlid: runbook.ulid,
        userId: foundUser.id,
      });
      setEmail("");
      refetchCollaborators();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to share notebook:", error);
      // TODO: Show error toast
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    try {
      await unshareMutation.mutateAsync({
        notebookUlid: runbook.ulid,
        userId,
      });
      refetchCollaborators();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to unshare notebook:", error);
      // TODO: Show error toast
    }
  };

  const formatUserName = (user: any) => {
    if (user.givenName && user.familyName) {
      return `${user.givenName} ${user.familyName}`;
    }
    return user.givenName || user.familyName || "Unknown User";
  };

  const handleClose = () => {
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Notebook</DialogTitle>
          <DialogDescription>
            Collaborate on "{runbook.title || "Untitled Notebook"}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Collaborator */}
          {canShare && (
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
                            <span>
                              You are already the owner of this notebook
                            </span>
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
                            disabled={isSharing}
                            className="w-full"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            {isSharing ? "Adding..." : "Add as collaborator"}
                          </Button>
                        )}
                      </div>
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
          )}

          {/* Current Access */}
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
                    {formatUserName(runbook.owner)}
                  </div>
                  <div className="text-xs text-gray-600">Owner</div>
                </div>
                <Badge variant="default">Owner</Badge>
              </div>

              {/* Collaborators */}
              {collaborators?.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between rounded border bg-gray-50 p-3"
                >
                  <div>
                    <div className="font-medium">
                      {formatUserName(collaborator)}
                    </div>
                    <div className="text-xs text-gray-600">Can edit</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Writer</Badge>
                    {canShare && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnshare(collaborator.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {runbook.collaborators.length === 0 && (
                <div className="rounded border-2 border-dashed border-gray-200 p-6 text-center">
                  <div className="text-sm text-gray-500">
                    No collaborators yet
                  </div>
                  {!canShare && (
                    <div className="mt-1 text-xs text-gray-400">
                      Only the owner can add collaborators
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
