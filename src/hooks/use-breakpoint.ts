import { useMedia } from "react-use";

type BreakpointKey = "sm" | "md" | "lg" | "xl" | "2xl";

// https://github.com/tailwindlabs/tailwindcss/discussions/16883
export function useBreakpoint(key: BreakpointKey) {
  return useMedia(`(max-width: var(--breakpoint-${key}))`);
}
