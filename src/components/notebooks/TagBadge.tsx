import { getTagColorClasses } from "@/lib/tag-colors";
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
      className={`px-2 py-0.5 text-xs ${getTagColorClasses(tag.color)} ${className}`}
      data-tag-id={tag.id}
    >
      {tag.name}
    </Badge>
  );
};
