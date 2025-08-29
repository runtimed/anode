import { getTagColorStyles } from "@/lib/tag-colors";
import type { TagColor } from "backend/trpc/types";
import React from "react";
import { Badge } from "../ui/badge";

interface TagBadgeProps {
  tag: { id: string; name: string; color: TagColor };
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, className = "" }) => {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0.5 text-xs ${className}`}
      data-tag-id={tag.id}
      style={getTagColorStyles(tag.color)}
    >
      {tag.name}
    </Badge>
  );
};
