import type { TagColor } from "backend/trpc/types";
import React from "react";
import { Input } from "../ui/input";
import { TagBadge } from "./TagBadge";

interface ColorPickerProps {
  tagName: string;
  selectedColor: TagColor;
  onColorChange: (color: TagColor) => void;
}

export const TagColorPicker: React.FC<ColorPickerProps> = ({
  tagName,
  selectedColor,
  onColorChange,
}) => {
  const handleColorChange = (value: string) => {
    // Ensure it starts with # and is a valid hex color
    let color = value;
    if (!color.startsWith("#")) {
      color = "#" + color;
    }

    // Only update if it's a valid 6-character hex color
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      onColorChange(color as TagColor);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      {tagName && (
        <div className="flex items-center justify-center rounded-md border bg-gray-50 p-4">
          <TagBadge
            tag={{
              id: "preview",
              name: tagName || "label-preview",
              color: selectedColor,
            }}
          />
        </div>
      )}

      {/* Color picker */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="h-10 w-10 cursor-pointer rounded border"
            style={{ backgroundColor: selectedColor }}
          />
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onColorChange(e.target.value as TagColor)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <Input
          type="text"
          value={selectedColor}
          onChange={(e) => handleColorChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="font-mono uppercase"
          style={{ width: "100px" }}
        />
      </div>

      <p className="text-xs text-gray-500">
        Hex colors should only contain numbers and letters from a-f.
      </p>
    </div>
  );
};
