import { useCallback, useRef } from "react";
import { useStore } from "@livestore/react";
import { signal } from "@runtimed/schema";

// Editor interface that we expect from CodeMirror editors
export interface EditorRef {
  focus: () => void;
  setCursorPosition: (position: "start" | "end") => void;
  getEditor: () => any;
}

// Create a signal to store editor refs by cell ID
const editorRefsSignal = signal(new Map<string, EditorRef>(), {
  label: "editorRefs$",
});

export const useEditorRegistry = () => {
  const { store } = useStore();
  const editorRefs = useRef<Map<string, EditorRef>>(new Map());

  const registerEditor = useCallback(
    (cellId: string, editorRef: EditorRef) => {
      editorRefs.current.set(cellId, editorRef);

      // Update the signal with new map
      const newMap = new Map(editorRefs.current);
      store.setSignal(editorRefsSignal, newMap);
    },
    [store]
  );

  const unregisterEditor = useCallback(
    (cellId: string) => {
      editorRefs.current.delete(cellId);

      // Update the signal with new map
      const newMap = new Map(editorRefs.current);
      store.setSignal(editorRefsSignal, newMap);
    },
    [store]
  );

  const focusCell = useCallback(
    (cellId: string, cursorPosition: "start" | "end" = "start") => {
      const editorRef = editorRefs.current.get(cellId);
      if (editorRef) {
        editorRef.focus();
        editorRef.setCursorPosition(cursorPosition);

        // Scroll cell into view for navigation
        const cellElement = document.querySelector(
          `[data-cell-id="${cellId}"]`
        );
        if (cellElement) {
          cellElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    },
    []
  );

  const hasEditor = useCallback((cellId: string) => {
    return editorRefs.current.has(cellId);
  }, []);

  const getEditor = useCallback((cellId: string) => {
    return editorRefs.current.get(cellId);
  }, []);

  return {
    registerEditor,
    unregisterEditor,
    focusCell,
    hasEditor,
    getEditor,
  };
};
