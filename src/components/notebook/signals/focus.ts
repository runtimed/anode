import { signal } from "@runtimed/schema";

/**
 * Signal tracking which cell is currently focused
 */
export const focusedCellSignal$ = signal<string | null>(null, {
  label: "focusedCellId$",
});

/**
 * Signal tracking whether the user has manually focused a cell
 * Used to determine if we should auto-focus the first cell
 */
export const hasManuallyFocused$ = signal<boolean>(false, {
  label: "hasManuallyFocused$",
});
