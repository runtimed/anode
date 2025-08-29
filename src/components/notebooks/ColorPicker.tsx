import React from "react";
import { cn } from "@/lib/utils";
import { getTagColorStyles } from "@/lib/tag-colors";
import type { TagColor } from "backend/trpc/types";
import { Input } from "../ui/input";

const defaultColors = [
  "#000000", // Black
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
] as const satisfies TagColor[];

interface ColorPickerProps {
  selectedColor: TagColor;
  onColorChange: (color: TagColor) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-9 gap-2", className)}>
      {defaultColors.map((color) => (
        <button
          type="button"
          key={color}
          onClick={() => onColorChange(color)}
          className={cn(
            "size-9 rounded-full border-2 transition-all hover:scale-110",
            selectedColor === color
              ? "ring-2 ring-gray-500 ring-offset-2 ring-offset-white"
              : ""
          )}
          style={getTagColorStyles(color)}
          title={color}
        >
          A
        </button>
      ))}
    </div>
  );
};
