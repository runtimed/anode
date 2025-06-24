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
        // Check if cursor is at the beginning of the first line
        const lines = value.split("\n");
        const beforeCursor = value.substring(0, selectionStart);
        const currentLineIndex = beforeCursor.split("\n").length - 1;
        const lastNewlineIndex = beforeCursor.lastIndexOf("\n");
        const positionInLine = lastNewlineIndex === -1
          ? selectionStart
          : selectionStart - lastNewlineIndex - 1;

        // Only move to previous cell if at the very beginning of the first line
        if (currentLineIndex === 0 && positionInLine === 0 && onFocusPrevious) {
          e.preventDefault();
          onUpdateSource?.();
          onFocusPrevious();
          return;
        }
      } else if (e.key === "ArrowDown" && selectionStart === selectionEnd) {
        // Check if cursor is at the end of the last line
        const lines = value.split("\n");
        const beforeCursor = value.substring(0, selectionStart);
        const currentLineIndex = beforeCursor.split("\n").length - 1;
        const currentLine = lines[currentLineIndex];
        const lastNewlineIndex = beforeCursor.lastIndexOf("\n");
        const positionInLine = lastNewlineIndex === -1
          ? selectionStart
          : selectionStart - lastNewlineIndex - 1;

        // Only move to next cell if at the very end of the last line
        if (
          currentLineIndex === lines.length - 1 &&
          positionInLine === currentLine.length && onFocusNext
        ) {
          e.preventDefault();
          onUpdateSource?.();
          onFocusNext();
          return;
        }
      }

      // Handle execution shortcuts
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+Enter: Run cell and move to next (or create new cell if at end)
        e.preventDefault();
        onUpdateSource?.();
        onExecute?.();
        if (onFocusNext) {
          onFocusNext(); // Move to next cell (or create new if at end)
        }
      }
      // Shift+Enter now creates a newline (default behavior) - no special handling needed
    },
    [onFocusNext, onFocusPrevious, onExecute, onUpdateSource],
  );

  return { handleKeyDown };
};
