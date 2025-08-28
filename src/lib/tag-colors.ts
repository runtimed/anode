import type { TagColor } from "backend/trpc/types";

export function getTagColorClasses(color: TagColor) {
  const colorMap: Record<TagColor, string> = {
    neutral: "border-neutral-300 text-neutral-700 bg-neutral-50",
    red: "border-red-300 text-red-700 bg-red-50",
    amber: "border-amber-300 text-amber-700 bg-amber-50",
    green: "border-green-300 text-green-700 bg-green-50",
    teal: "border-teal-300 text-teal-700 bg-teal-50",
    sky: "border-sky-300 text-sky-700 bg-sky-50",
    blue: "border-blue-300 text-blue-700 bg-blue-50",
    indigo: "border-indigo-300 text-indigo-700 bg-indigo-50",
    fuchsia: "border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50",
    pink: "border-pink-300 text-pink-700 bg-pink-50",
  };

  return colorMap[color];
}

export function getTagDotColorClass(color: TagColor) {
  const colorMap: Record<TagColor, string> = {
    neutral: "bg-neutral-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    teal: "bg-teal-500",
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    fuchsia: "bg-fuchsia-500",
    pink: "bg-pink-500",
  };

  return colorMap[color];
}
