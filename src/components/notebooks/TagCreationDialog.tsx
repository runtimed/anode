import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { ColorPicker } from "./ColorPicker";
import { useTrpc } from "../TrpcProvider";
import { trpcQueryClient } from "@/lib/trpc-client";
import { TagColor } from "backend/trpc/types";

interface TagCreationDialogProps {
  onTagCreated?: () => void;
}

export const TagCreationDialog: React.FC<TagCreationDialogProps> = ({
  onTagCreated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<TagColor>("neutral");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trpc = useTrpc();
  const createTagMutation = useMutation(trpc.createTag.mutationOptions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setIsSubmitting(true);
    try {
      await createTagMutation.mutateAsync({
        name: tagName.trim(),
        color: selectedColor,
      });

      // Invalidate tags query to refresh the list
      trpcQueryClient.invalidateQueries({
        queryKey: trpc.tags.queryKey(),
      });

      // Reset form
      setTagName("");
      setSelectedColor("neutral");
      setIsOpen(false);
      onTagCreated?.();
    } catch (error) {
      console.error("Failed to create tag:", error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setTagName("");
      setSelectedColor("neutral");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <X className="mr-2 h-4 w-4 rotate-45" />
          Add Tag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tag-name" className="text-sm font-medium">
              Tag Name
            </label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Enter tag name..."
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
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
              {isSubmitting ? "Creating..." : "Create Tag"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
