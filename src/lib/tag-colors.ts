import type { TagColor } from "backend/trpc/types";

export function getTagColorClasses(color: TagColor) {
  const colorMap: Record<TagColor, string> = {
    red: "border-red-300 text-red-700 bg-red-50",
    orange: "border-orange-300 text-orange-700 bg-orange-50",
    amber: "border-amber-300 text-amber-700 bg-amber-50",
    yellow: "border-yellow-300 text-yellow-700 bg-yellow-50",
    lime: "border-lime-300 text-lime-700 bg-lime-50",
    green: "border-green-300 text-green-700 bg-green-50",
    emerald: "border-emerald-300 text-emerald-700 bg-emerald-50",
    teal: "border-teal-300 text-teal-700 bg-teal-50",
    cyan: "border-cyan-300 text-cyan-700 bg-cyan-50",
    sky: "border-sky-300 text-sky-700 bg-sky-50",
    blue: "border-blue-300 text-blue-700 bg-blue-50",
    indigo: "border-indigo-300 text-indigo-700 bg-indigo-50",
    violet: "border-violet-300 text-violet-700 bg-violet-50",
    purple: "border-purple-300 text-purple-700 bg-purple-50",
    fuchsia: "border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50",
    pink: "border-pink-300 text-pink-700 bg-pink-50",
    rose: "border-rose-300 text-rose-700 bg-rose-50",
    neutral: "border-neutral-300 text-neutral-700 bg-neutral-50",
  };

  return colorMap[color];
}

export function getTagDotColorClass(color: TagColor) {
  const colorMap: Record<TagColor, string> = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    amber: "bg-amber-500",
    yellow: "bg-yellow-500",
    lime: "bg-lime-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    sky: "bg-sky-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    purple: "bg-purple-500",
    fuchsia: "bg-fuchsia-500",
    pink: "bg-pink-500",
    rose: "bg-rose-500",
    neutral: "bg-neutral-500",
  };

  return colorMap[color];
}
