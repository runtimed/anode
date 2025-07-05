import { KeyBinding } from "@codemirror/view";
import { useCallback, useMemo } from "react";

interface CellKeyboardNavigationOptions {
  onFocusNext?: () => void;
  onFocusPrevious?: () => void;
  onExecute?: () => void;
  onUpdateSource?: () => void;
  onDeleteCell?: () => void;
}

export const useCellKeyboardNavigation = ({
  onFocusNext,
  onFocusPrevious,
  onDeleteCell,
  onExecute,
  onUpdateSource,
}: CellKeyboardNavigationOptions) => {
  const keyMap = useMemo(() => {
    const map: KeyBinding[] = [
      {
        mac: "Meta-Enter",
        win: "Ctrl-Enter",
        linux: "Meta-Enter",
        run: () => {
          onUpdateSource?.();
          onExecute?.();
          return true;
        },
      },
      {
        key: "Shift-Enter",
        run: () => {
          onUpdateSource?.();
          onExecute?.();
          onFocusNext?.();
          return true;
        },
      },
      {
        key: "ArrowDown",
        run: (editor) => {
          const { state } = editor;
          const { selection } = state;
          const cursorPos = selection.main.head;
          const docLength = state.doc.length;

          if (cursorPos === docLength) {
            onFocusNext?.();
            // Prevent CodeMirror from handling
            return true;
          }
          // Pass on to CodeMirror
          return false;
        },
      },
      {
        key: "ArrowUp",
        run: (editor) => {
          const { state } = editor;
          const { selection } = state;
          const cursorPos = selection.main.head;

          if (cursorPos === 0) {
            onFocusPrevious?.();
            // Prevent CodeMirror from handling
            return true;
          }
          // Pass on to CodeMirror
          return false;
        },
      },
      {
        key: "Backspace",
        preventDefault: true,
        run: (editor) => {
          if (editor.state.doc.length === 0) {
            onDeleteCell?.();
            if (onFocusPrevious) {
              onFocusPrevious();
            } else {
              onFocusNext?.();
            }
          }
          return false;
        },
      },
    ];
    return map;
  }, [onExecute, onFocusNext, onFocusPrevious, onDeleteCell, onUpdateSource]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;

      if (
        e.key === "Backspace" &&
        selectionStart === selectionEnd &&
        selectionStart === 0
      ) {
        e.preventDefault();
        onDeleteCell?.();
        onFocusPrevious?.();
        return;
      }

      // Handle Home/End keys to prevent page navigation
      if (e.key === "Home" || e.key === "End") {
        // Let the textarea handle Home/End internally, but stop propagation to prevent page scroll
        e.stopPropagation();
        return;
      }

      // Handle arrow key navigation between cells
      if (e.key === "ArrowUp" && selectionStart === selectionEnd) {
        // Check if cursor is at the beginning of the first line
        const beforeCursor = value.substring(0, selectionStart);
        const currentLineIndex = beforeCursor.split("\n").length - 1;
        const lastNewlineIndex = beforeCursor.lastIndexOf("\n");
        const positionInLine =
          lastNewlineIndex === -1
            ? selectionStart
            : selectionStart - lastNewlineIndex - 1;

        if (currentLineIndex === 0) {
          // We're on the first line
          if (positionInLine === 0) {
            // At the very beginning - move to previous cell
            if (onFocusPrevious) {
              e.preventDefault();
              onUpdateSource?.();
              onFocusPrevious();
              return;
            }
          } else {
            // Not at beginning of first line - move to beginning
            e.preventDefault();
            textarea.setSelectionRange(0, 0);
            return;
          }
        }
      } else if (e.key === "ArrowDown" && selectionStart === selectionEnd) {
        // Check if cursor is at the end of the last line
        const lines = value.split("\n");
        const beforeCursor = value.substring(0, selectionStart);
        const currentLineIndex = beforeCursor.split("\n").length - 1;
        const currentLine = lines[currentLineIndex];
        const lastNewlineIndex = beforeCursor.lastIndexOf("\n");
        const positionInLine =
          lastNewlineIndex === -1
            ? selectionStart
            : selectionStart - lastNewlineIndex - 1;

        if (currentLineIndex === lines.length - 1) {
          // We're on the last line
          if (positionInLine === currentLine.length) {
            // At the very end - move to next cell
            if (onFocusNext) {
              e.preventDefault();
              onUpdateSource?.();
              onFocusNext();
              return;
            }
          } else {
            // Not at end of last line - move to end
            e.preventDefault();
            textarea.setSelectionRange(value.length, value.length);
            return;
          }
        }
      }

      // Handle execution shortcuts
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter: Run cell but stay in current cell
        e.preventDefault();
        onUpdateSource?.();
        onExecute?.();
        // Don't move to next cell - stay in current cell
      } else if (e.key === "Enter" && e.shiftKey) {
        // Cmd+Enter: Run cell and move to next (or create new cell if at end)
        e.preventDefault();
        onUpdateSource?.();
        onExecute?.();
        onFocusNext?.(); // Move to next cell (or create new if at end)
      }
    },
    [onFocusNext, onFocusPrevious, onExecute, onUpdateSource, onDeleteCell]
  );

  return { handleKeyDown, keyMap };
};
