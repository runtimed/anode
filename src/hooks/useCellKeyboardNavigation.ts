import { useCallback } from "react";

interface CellKeyboardNavigationOptions {
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  onExecute?: () => void;
  onUpdateSource?: () => void;
}

export const useCellKeyboardNavigation = ({
  onFocusNext,
  onFocusPrevious,
  onExecute,
  onUpdateSource,
}: CellKeyboardNavigationOptions) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      // Handle Home/End keys to prevent page navigation
      if (e.key === "Home" || e.key === "End") {
        // Let the textarea handle Home/End internally, but stop propagation to prevent page scroll
        e.stopPropagation();
        return;
      }

      // Handle arrow key navigation between cells
      if (e.key === "ArrowUp" && selectionStart === selectionEnd) {
        // For empty cells or cursor at beginning of first line
        const beforeCursor = value.substring(0, selectionStart);
        const isAtTop = selectionStart === 0 || !beforeCursor.includes("\n");

        if (isAtTop && onFocusPrevious) {
          e.preventDefault();
          onUpdateSource?.();
          onFocusPrevious();
          return;
        }
      } else if (e.key === "ArrowDown" && selectionStart === selectionEnd) {
        // For empty cells or cursor at end of last line
        const afterCursor = value.substring(selectionEnd);
        const isAtBottom = selectionEnd === value.length ||
          !afterCursor.includes("\n");

        if (isAtBottom && onFocusNext) {
          e.preventDefault();
          onUpdateSource?.();
          onFocusNext();
          return;
        }
      }

      // Handle execution shortcuts
      if (e.key === "Enter" && e.shiftKey) {
        // Shift+Enter: Run cell and move to next (or create new cell if at end)
        e.preventDefault();
        onUpdateSource?.();
        onExecute?.();
        if (onFocusNext) {
          onFocusNext(); // Move to next cell (or create new if at end)
        }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+Enter: Run cell but stay in current cell
        e.preventDefault();
        onUpdateSource?.();
        onExecute?.();
        // Don't move to next cell - stay in current cell
      }
    },
    [onFocusNext, onFocusPrevious, onExecute, onUpdateSource],
  );

  return { handleKeyDown };
};
