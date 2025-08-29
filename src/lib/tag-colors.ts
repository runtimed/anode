import type { TagColor } from "backend/trpc/types";

export function getTagColorStyles(color: TagColor) {
  if (!color.startsWith("#")) {
    throw new Error("Color must be a hex color");
  }

  // Handle hex color with OKLab transformations
  const baseColor = color;
  const textColor = `oklch(from ${baseColor} 0.2 c h)`; // Darker text
  const backgroundColor = `oklch(from ${baseColor} 0.9 c h)`; // Lighter background
  const borderColor = `oklch(from ${baseColor} 0.7 c h)`; // Medium border

  return {
    color: textColor,
    backgroundColor,
    borderColor,
  };
}

export function getTagDotColorStyles(color: TagColor): {
  backgroundColor: string;
} {
  if (!color.startsWith("#")) throw new Error("Color must be a hex color");

  // Handle hex color with OKLab transformations
  const baseColor = color;
  // const backgroundColor = `oklch(from ${baseColor} calc(l + 0.1) c h)`; // Slightly lighter for dot

  return {
    backgroundColor: baseColor,
  };
}
