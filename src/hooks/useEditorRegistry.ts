import { useCallback, useRef } from "react";
import { useStore } from "@livestore/react";
import { signal } from "@livestore/livestore";
import type { CodeMirrorEditorRef } from "@/components/notebook/codemirror/CodeMirrorEditor";

// Create a signal to store editor refs by cell ID
const editorRefsSignal = signal(
  new Map<string, CodeMirrorEditorRef>(),
  { label: "editorRefs" }
);

export const useEditorRegistry = () => {
  const { store } = useStore();
  const editorRefs = useRef<Map<string, CodeMirrorEditorRef>>(new Map());

  const registerEditor = useCallback(
    (cellId: string, editorRef: CodeMirrorEditorRef) => {
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
      }
    },
    []
  );

  const setCellCursorPosition = useCallback(
    (cellId: string, position: "start" | "end") => {
      const editorRef = editorRefs.current.get(cellId);
      if (editorRef) {
        editorRef.setCursorPosition(position);
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
    setCellCursorPosition,
    hasEditor,
    getEditor,
  };
};
