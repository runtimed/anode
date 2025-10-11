import { useNotebook } from "@/components/notebooks/notebook/helpers";
import {
  downloadNotebookAsIpynb,
  exportNotebookToJupyter,
} from "@/util/notebook-export";
import { useStore } from "@livestore/react";
import { useCallback } from "react";

/**
 * Hook for exporting notebook to Jupyter (.ipynb) format
 */
export function useNotebookExport() {
  const { store } = useStore();

  const { notebook } = useNotebook(store.storeId);

  const notebookTitle = notebook?.title ?? "Untitled";
  const exportToJupyter = useCallback(() => {
    if (!store) {
      console.error("Store not available for export");
      return;
    }

    try {
      const jupyterNotebook = exportNotebookToJupyter(store, notebookTitle);
      const filename =
        notebookTitle === "Untitled"
          ? "notebook"
          : notebookTitle.replace(/[^a-zA-Z0-9-_]/g, "_");

      downloadNotebookAsIpynb(jupyterNotebook, `${filename}.ipynb`);
    } catch (error) {
      console.error("Failed to export notebook:", error);
    }
  }, [store, notebookTitle]);

  return {
    exportToJupyter,
    notebookTitle,
  };
}
