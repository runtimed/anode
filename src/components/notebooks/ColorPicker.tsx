import React from "react";
import { cn } from "@/lib/utils";
import { getTagDotColorClass } from "@/lib/tag-colors";
import type { TagColor } from "backend/trpc/types";

const TAILWIND_COLORS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "neutral",
] as const;

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
    <div className={cn("grid grid-cols-6 gap-2", className)}>
      {TAILWIND_COLORS.map((color) => (
        <button
          type="button"
          key={color}
          onClick={() => onColorChange(color)}
          className={cn(
            "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
            getTagDotColorClass(color),
            selectedColor === color
              ? "border-gray-900 ring-2 ring-gray-300"
              : "border-gray-300 hover:border-gray-400"
          )}
          title={color}
        />
      ))}
    </div>
  );
};
