import type { TagColor } from "backend/trpc/types";
import chroma from "chroma-js";
import React from "react";
import { Badge } from "../ui/badge";

interface TagBadgeProps {
  tag: { id: string; name: string; color: TagColor };
  className?: string;
}

// Function to determine if text should be white or black based on background color
// Biased toward white text for better readability on medium-dark colors, especially blues
function getContrastTextColor(hexColor: string): string {
  const color = chroma(hexColor);

  // Get HSL values to check for blue hues and lightness
  const [hue, , lightness] = color.hsl();

  // For blue-ish colors (210-270 degrees), use white text unless very light
  const isBlueish = hue >= 210 && hue <= 270;
  if (isBlueish && lightness < 0.8) {
    return "#ffffff";
  }

  // For other colors, use white text if lightness is below 0.65 (biased toward white)
  // This is more conservative than pure contrast calculation
  return lightness < 0.65 ? "#ffffff" : "#000000";
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
