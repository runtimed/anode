import { getTagDotColorStyles } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import type { TagColor } from "backend/trpc/types";
import React from "react";
import { buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { TagBadge } from "./TagBadge";

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
  tagName?: string;
  selectedColor: TagColor;
  onColorChange: (color: TagColor) => void;
  className?: string;
}

export const TagColorPicker: React.FC<ColorPickerProps> = ({
  tagName,
  selectedColor,
  onColorChange,
  className,
}) => {
  const isCustom = !defaultColors.includes(selectedColor as any);

  return (
    <div className="flex flex-col rounded-md border">
      {/* Preview section */}
      <div className="bg-muted flex items-center justify-center gap-1 border-b p-5">
        <span
          className="h-3 w-3 rounded-md border"
          style={getTagDotColorStyles(selectedColor)}
        />
        <TagBadge
          tag={{
            id: "1",
            name: tagName || "example tag",
            color: selectedColor,
          }}
        />
      </div>

      <div className={cn("flex gap-2 p-4 pb-0", className)}>
        {defaultColors.map((color) => (
          <button
            type="button"
            key={color}
            onClick={() => onColorChange(color)}
            className={cn(
              "size-8 rounded-full border-1 transition-all hover:scale-110",
              selectedColor === color &&
                "ring-2 ring-gray-500 ring-offset-2 ring-offset-white"
            )}
            style={getTagDotColorStyles(color)}
            title={color}
          ></button>
        ))}
      </div>

      <div className="flex items-center gap-2 p-4">
        <div
          className={cn(
            "relative",
            buttonVariants({ variant: "outline", size: "icon" }),
            isCustom && "ring-2 ring-gray-500"
          )}
        >
          <div
            className="size-7 rounded-sm"
            style={getTagDotColorStyles(selectedColor)}
          />
          <input
            className="absolute h-full w-full opacity-0"
            type="color"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value as TagColor)}
          />
        </div>
        <Input
          type="text"
          value={selectedColor}
          onChange={(e) => {
            // Only allow valid hex color codes, with or without leading #
            let val = e.target.value.trim();
            if (!val.startsWith("#")) val = "#" + val;
            // Accept only 7-character hex codes (#RRGGBB)
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
              onColorChange(val as TagColor);
            } else {
              // Allow partial input for editing, but don't call onColorChange
              onColorChange(e.target.value as TagColor);
            }
          }}
          pattern="^#?[0-9a-fA-F]{6}$"
          maxLength={7}
          placeholder="#000000"
          className={cn("font-mono")}
        />
      </div>
    </div>
  );
};
