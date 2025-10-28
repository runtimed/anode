import { useMedia } from "react-use";

// https://github.com/tailwindlabs/tailwindcss/discussions/16883

const breakpointKeys = ["sm", "md", "lg", "xl", "2xl"] as const;
type BreakpointKey = (typeof breakpointKeys)[number];

const breakpointValues = breakpointKeys.reduce(
  (acc, key) => {
    acc[key] = getComputedStyle(document.documentElement).getPropertyValue(
      `--breakpoint-${key}`
    );
    return acc;
  },
  {} as Record<BreakpointKey, string>
);

export function useMinWidth(key: BreakpointKey) {
  const width = breakpointValues[key];

  return useMedia(`(min-width: ${width})`);
}

export function useMaxWidth(key: BreakpointKey) {
  const width = breakpointValues[key];

  return useMedia(`(max-width: ${width})`);
}
