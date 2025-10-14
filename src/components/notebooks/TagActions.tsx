import { trpcQueryClient } from "@/lib/trpc-client";

import { useMutation } from "@tanstack/react-query";
import type { TagRow } from "backend/trpc/types";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "../ui/confirm";
import { useTrpc } from "../TrpcProvider";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TagEditDialog } from "./TagEditDialog";
import { TagBadge } from "./TagBadge";

export const TagActions = ({ tag }: { tag: TagRow }) => {
  const trpc = useTrpc();
  const { confirm } = useConfirm();
  const deleteTagMutation = useMutation(trpc.deleteTag.mutationOptions());

  const handleDeleteConfirm = async () => {
    try {
      await deleteTagMutation.mutateAsync({ id: tag.id });

      // Invalidate queries to refresh the UI
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.tags.queryKey(),
      });
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.notebooks.queryKey(),
      });
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast.error("Failed to delete tag");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <TagEditDialog tag={tag}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </TagEditDialog>
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              confirm({
                title: "Delete Tag",
                description: (
                  <>
                    Are you sure you want to delete the tag{" "}
                    <TagBadge tag={tag} />? This action cannot be undone and
                    will remove this tag from all notebooks.
                  </>
                ),
                onConfirm: handleDeleteConfirm,
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
