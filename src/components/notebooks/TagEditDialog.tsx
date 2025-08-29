import { useMutation } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import { trpcQueryClient } from "@/lib/trpc-client";
import { TagColor, TagRow } from "backend/trpc/types";
import { useTrpc } from "../TrpcProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ColorPicker } from "./ColorPicker";

interface TagEditDialogProps {
  tag: TagRow;
  onTagEdited?: () => void;
  children: React.ReactNode;
}

export const TagEditDialog: React.FC<TagEditDialogProps> = ({
  tag,
  onTagEdited,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tagName, setTagName] = useState(tag.name);
  const [selectedColor, setSelectedColor] = useState<TagColor>(tag.color);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trpc = useTrpc();
  const updateTagMutation = useMutation(trpc.updateTag.mutationOptions());

  // Update form when tag prop changes
  useEffect(() => {
    setTagName(tag.name);
    setSelectedColor(tag.color);
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setIsSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      await updateTagMutation.mutateAsync({
        id: tag.id,
        name: tagName.trim(),
        color: selectedColor,
      });

      // Invalidate tags query to refresh the list
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.tags.queryKey(),
      });

      // Reset form
      setError(null);
      setIsOpen(false);
      onTagEdited?.();
    } catch (error) {
      console.error("Failed to update tag:", error);

      // Handle tRPC errors specifically
      if (error && typeof error === "object" && "data" in error) {
        const trpcError = error as {
          data?: { code?: string };
          message?: string;
        };
        if (trpcError.data?.code === "CONFLICT") {
          setError(
            "A tag with this name already exists. Please choose a different name."
          );
        } else {
          setError(
            trpcError.message || "Failed to update tag. Please try again."
          );
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setError(null);
    setIsOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setTagName(tag.name);
      setSelectedColor(tag.color);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tag-name" className="text-sm font-medium">
              Tag Name
            </label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => {
                setTagName(e.target.value);
                // Clear error when user starts typing
                if (error) setError(null);
              }}
              placeholder="Enter tag name..."
              maxLength={50}
              required
              className={error ? "border-red-500 focus:border-red-500" : ""}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Color</div>
            <ColorPicker
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!tagName.trim() || isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Tag"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
