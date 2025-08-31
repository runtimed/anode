import type { TagColor } from "backend/trpc/types";
import chroma from "chroma-js";
import React from "react";
import { Badge } from "../ui/badge";

interface TagBadgeProps {
  tag: { id: string; name: string; color: TagColor };
  className?: string;
}

// Function to determine if text should be white or black based on background color
// Uses chroma-js for proper WCAG contrast calculation
function getContrastTextColor(hexColor: string): string {
  const color = chroma(hexColor);

  // Calculate contrast with white and black, return the one with better contrast
  const contrastWithWhite = chroma.contrast(color, "white");
  const contrastWithBlack = chroma.contrast(color, "black");

  return contrastWithWhite > contrastWithBlack ? "#ffffff" : "#000000";
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, className = "" }) => {
  const textColor = getContrastTextColor(tag.color);

  return (
    <Badge
      variant="secondary"
      className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${className}`}
      data-tag-id={tag.id}
      style={{
        backgroundColor: tag.color,
        color: textColor,
      }}
    >
      {tag.name}
    </Badge>
  );
};
