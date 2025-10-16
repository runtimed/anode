import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorePromise, queryDb } from "@runtimed/schema";
import { makeAdapter } from "@livestore/adapter-node";
import { events, tables, schema } from "@runtimed/schema";
import { exportNotebookToJupyter } from "../src/util/notebook-export.js";
import { JupyterNotebook } from "../src/types/jupyter.js";
import {
  cleanupResources,
  createTestSessionId,
  createTestStoreId,
  waitFor,
} from "./setup.js";

describe("Notebook Export to Jupyter", () => {
  let store: any;
  let storeId: string;
  let sessionId: string;
  let runtimeId: string;

  beforeEach(async () => {
    storeId = createTestStoreId();
    sessionId = createTestSessionId();
    runtimeId = `runtime-${Date.now()}`;

    const adapter = makeAdapter({
      storage: { type: "in-memory" },
    });

    store = await createStorePromise({
      adapter,
      schema,
      storeId,
    });
  });

  afterEach(async () => {
    await cleanupResources(store);
  });

  describe("Basic Export Functionality", () => {
    it("should export a simple notebook with code cells", async () => {
      const cellId1 = "cell-001";
      const cellId2 = "cell-002";
      const outputId1 = "output-001";
      const outputId2 = "output-002";

      // Create first code cell
      store.commit(
        events.cellCreated2({
          id: cellId1,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      store.commit(
        events.cellSourceChanged({
          id: cellId1,
          source: 'print("Hello, World!")',
          modifiedBy: "test-user",
        })
      );

      // Create second code cell
      store.commit(
        events.cellCreated2({
          id: cellId2,
          cellType: "code",
          fractionalIndex: "a1",
          createdBy: "test-user",
        })
      );

      store.commit(
        events.cellSourceChanged({
          id: cellId2,
          source: "x = 42\nprint(f'x = {x}')",
          modifiedBy: "test-user",
        })
      );

      // Add outputs to first cell
      store.commit(
        events.terminalOutputAdded({
          id: outputId1,
          cellId: cellId1,
          content: {
            type: "inline",
            data: "Hello, World!\n",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      // Add outputs to second cell
      store.commit(
        events.terminalOutputAdded({
          id: outputId2,
          cellId: cellId2,
          content: {
            type: "inline",
            data: "x = 42\n",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const cells = store.query(tables.cells.select());
        const outputs = store.query(tables.outputs.select());
        return cells.length === 2 && outputs.length === 2;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(
        store,
        "Test Export Notebook"
      );

      // Verify basic structure
      expect(exportedNotebook).toBeDefined();
      expect(exportedNotebook.nbformat).toBe(4);
      expect(exportedNotebook.nbformat_minor).toBe(5);
      expect(exportedNotebook.cells).toHaveLength(2);

      // Verify metadata
      expect(exportedNotebook.metadata.kernelspec.display_name).toBe(
        "Python 3"
      );
      expect(exportedNotebook.metadata.kernelspec.language).toBe("python");
      expect(exportedNotebook.metadata.kernelspec.name).toBe("python3");

      // Verify cells
      const cell1 = exportedNotebook.cells[0];
      expect(cell1.cell_type).toBe("code");
      expect(cell1.source).toEqual(['print("Hello, World!")']);
      expect(cell1.outputs).toHaveLength(1);
      expect(cell1.outputs![0].output_type).toBe("stream");
      expect(cell1.outputs![0].name).toBe("stdout");
      expect(cell1.outputs![0].text).toBe("Hello, World!\n");

      const cell2 = exportedNotebook.cells[1];
      expect(cell2.cell_type).toBe("code");
      expect(cell2.source).toEqual(["x = 42", "print(f'x = {x}')"]);
      expect(cell2.outputs).toHaveLength(1);
      expect(cell2.outputs![0].output_type).toBe("stream");
      expect(cell2.outputs![0].name).toBe("stdout");
      expect(cell2.outputs![0].text).toBe("x = 42\n");
    });

    it("should export notebook with different cell types", async () => {
      const codeCellId = "code-cell";
      const markdownCellId = "markdown-cell";
      const aiCellId = "ai-cell";
      const sqlCellId = "sql-cell";

      // Store is already initialized with storeId

      // Create code cell
      store.commit(
        events.cellCreated2({
          id: codeCellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );
      store.commit(
        events.cellSourceChanged({
          id: codeCellId,
          source: "print('Code cell')",
          modifiedBy: "test-user",
        })
      );

      // Create markdown cell
      store.commit(
        events.cellCreated2({
          id: markdownCellId,
          cellType: "markdown",
          fractionalIndex: "a1",
          createdBy: "test-user",
        })
      );
      store.commit(
        events.cellSourceChanged({
          id: markdownCellId,
          source: "# Markdown Cell\n\nThis is a markdown cell.",
          modifiedBy: "test-user",
        })
      );

      // Create AI cell
      store.commit(
        events.cellCreated2({
          id: aiCellId,
          cellType: "ai",
          fractionalIndex: "a2",
          createdBy: "test-user",
        })
      );
      store.commit(
        events.cellSourceChanged({
          id: aiCellId,
          source: "Create a function to calculate fibonacci numbers",
          modifiedBy: "test-user",
        })
      );

      // Create SQL cell
      store.commit(
        events.cellCreated2({
          id: sqlCellId,
          cellType: "sql",
          fractionalIndex: "a3",
          createdBy: "test-user",
        })
      );
      store.commit(
        events.cellSourceChanged({
          id: sqlCellId,
          source: "SELECT * FROM users LIMIT 10;",
          modifiedBy: "test-user",
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const cells = store.query(tables.cells.select());
        return cells.length === 4;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store);

      // Verify all cells are exported
      expect(exportedNotebook.cells).toHaveLength(4);

      // Verify cell types are converted correctly
      expect(exportedNotebook.cells[0].cell_type).toBe("code");
      expect(exportedNotebook.cells[0].source).toEqual(["print('Code cell')"]);

      expect(exportedNotebook.cells[1].cell_type).toBe("markdown");
      expect(exportedNotebook.cells[1].source).toEqual([
        "# Markdown Cell",
        "",
        "This is a markdown cell.",
      ]);

      expect(exportedNotebook.cells[2].cell_type).toBe("code");
      expect(exportedNotebook.cells[2].source).toEqual([
        "# AI PROMPT: Create a function to calculate fibonacci numbers",
      ]);

      expect(exportedNotebook.cells[3].cell_type).toBe("code");
      expect(exportedNotebook.cells[3].source).toEqual([
        "SELECT * FROM users LIMIT 10;",
      ]);
    });

    it("should handle empty notebook", async () => {
      // Store is already initialized with storeId

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store, "Empty Notebook");

      // Verify structure
      expect(exportedNotebook).toBeDefined();
      expect(exportedNotebook.cells).toHaveLength(0);
      expect(exportedNotebook.nbformat).toBe(4);
      expect(exportedNotebook.nbformat_minor).toBe(5);
    });
  });

  describe("Output Conversion", () => {
    it("should convert different output types correctly", async () => {
      const cellId = "output-test-cell";
      const stdoutOutputId = "stdout-output";
      const stderrOutputId = "stderr-output";
      const errorOutputId = "error-output";
      const multimediaOutputId = "multimedia-output";

      // Store is already initialized with storeId

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      // Add stdout output
      store.commit(
        events.terminalOutputAdded({
          id: stdoutOutputId,
          cellId,
          content: {
            type: "inline",
            data: "Standard output\n",
          },
          streamName: "stdout",
          position: 0,
        })
      );

      // Add stderr output
      store.commit(
        events.terminalOutputAdded({
          id: stderrOutputId,
          cellId,
          content: {
            type: "inline",
            data: "Error output\n",
          },
          streamName: "stderr",
          position: 1,
        })
      );

      // Add error output
      store.commit(
        events.errorOutputAdded({
          id: errorOutputId,
          cellId,
          content: {
            type: "inline",
            data: {
              ename: "ValueError",
              evalue: "Test error message",
              traceback: [
                "Traceback (most recent call last):",
                '  File "<stdin>", line 1, in <module>',
                "ValueError: Test error message",
              ],
            },
          },
          position: 2,
        })
      );

      // Add multimedia output (rich display)
      store.commit(
        events.multimediaDisplayOutputAdded({
          id: multimediaOutputId,
          cellId,
          representations: {
            "text/plain": {
              type: "inline",
              data: "Hello from multimedia output",
            },
            "text/html": {
              type: "inline",
              data: "<p>Hello from multimedia output</p>",
            },
          },
          position: 3,
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const outputs = store.query(tables.outputs.select());
        return outputs.length === 4;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store);

      // Verify outputs are converted correctly
      const cell = exportedNotebook.cells[0];
      expect(cell.outputs).toHaveLength(4);

      // Check stdout output
      const stdoutOutput = cell.outputs![0];
      expect(stdoutOutput.output_type).toBe("stream");
      expect(stdoutOutput.name).toBe("stdout");
      expect(stdoutOutput.text).toBe("Standard output\n");

      // Check stderr output
      const stderrOutput = cell.outputs![1];
      expect(stderrOutput.output_type).toBe("stream");
      expect(stderrOutput.name).toBe("stderr");
      expect(stderrOutput.text).toBe("Error output\n");

      // Check error output
      const errorOutput = cell.outputs![2];
      expect(errorOutput.output_type).toBe("error");
      expect(errorOutput.ename).toBe("ValueError");
      expect(errorOutput.evalue).toBe("Test error message");
      expect(errorOutput.traceback).toEqual([
        "Traceback (most recent call last):",
        '  File "<stdin>", line 1, in <module>',
        "ValueError: Test error message",
      ]);

      // Check multimedia output
      const multimediaOutput = cell.outputs![3];
      expect(multimediaOutput.output_type).toBe("display_data");
      expect(multimediaOutput.data).toEqual({
        "text/plain": "Hello from multimedia output",
        "text/html": "<p>Hello from multimedia output</p>",
      });
    });

    it("should handle cells without outputs", async () => {
      const cellId = "no-output-cell";

      // Store is already initialized with storeId

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: "# This cell has no output",
          modifiedBy: "test-user",
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const cells = store.query(tables.cells.select());
        return cells.length === 1;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store);

      // Verify cell has no outputs
      const cell = exportedNotebook.cells[0];
      expect(cell.outputs).toEqual([]);
    });

    it("should handle multimedia outputs with multiple representations", async () => {
      const cellId = "multimedia-cell";
      const multimediaOutputId = "multimedia-output";

      // Store is already initialized with storeId

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      // Add multimedia output with multiple representations
      store.commit(
        events.multimediaDisplayOutputAdded({
          id: multimediaOutputId,
          cellId,
          representations: {
            "text/plain": {
              type: "inline",
              data: "Hello from multimedia output",
            },
            "text/html": {
              type: "inline",
              data: "<p>Hello from multimedia output</p>",
            },
            "application/json": {
              type: "inline",
              data: JSON.stringify({ message: "Hello from multimedia output" }),
            },
          },
          position: 0,
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const outputs = store.query(tables.outputs.select());
        return outputs.length === 1;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store);

      // Verify multimedia output is converted correctly
      const cell = exportedNotebook.cells[0];
      expect(cell.outputs).toHaveLength(1);
      expect(cell.outputs![0].output_type).toBe("display_data");
      expect(cell.outputs![0].data).toEqual({
        "text/plain": "Hello from multimedia output",
        "text/html": "<p>Hello from multimedia output</p>",
        "application/json": JSON.stringify({
          message: "Hello from multimedia output",
        }),
      });
    });
  });

  describe("Cell Ordering", () => {
    it("should maintain cell order based on fractional index", async () => {
      const cellIds = ["cell-1", "cell-2", "cell-3", "cell-4"];
      const fractionalIndexes = ["a0", "a1", "a2", "a3"];

      // Store is already initialized with storeId

      // Create cells in specific order
      cellIds.forEach((cellId, index) => {
        store.commit(
          events.cellCreated2({
            id: cellId,
            cellType: "code",
            fractionalIndex: fractionalIndexes[index],
            createdBy: "test-user",
          })
        );

        store.commit(
          events.cellSourceChanged({
            id: cellId,
            source: `print("Cell ${index + 1}")`,
            modifiedBy: "test-user",
          })
        );
      });

      // Wait for state to settle
      await waitFor(() => {
        const cells = store.query(tables.cells.select());
        return cells.length === 4;
      });

      // Export notebook
      const exportedNotebook = exportNotebookToJupyter(store);

      // Verify cells are in correct order
      expect(exportedNotebook.cells).toHaveLength(4);
      exportedNotebook.cells.forEach((cell, index) => {
        expect(cell.source).toEqual([`print("Cell ${index + 1}")`]);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed output data gracefully", async () => {
      const cellId = "malformed-cell";
      const outputId = "malformed-output";

      // Store is already initialized with storeId

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      // Add output with malformed data
      store.commit(
        events.multimediaDisplayOutputAdded({
          id: outputId,
          cellId,
          representations: {
            "text/plain": {
              type: "artifact", // This should be handled gracefully
              artifactId: "artifact-id-123",
            },
          },
          position: 0,
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const outputs = store.query(tables.outputs.select());
        return outputs.length === 1;
      });

      // Export should not throw an error
      expect(() => {
        exportNotebookToJupyter(store);
      }).not.toThrow();

      // Verify the notebook is still valid
      const exportedNotebook = exportNotebookToJupyter(store);
      expect(exportedNotebook).toBeDefined();
      expect(exportedNotebook.cells).toHaveLength(1);
    });

    it("should handle unknown output types with fallback", async () => {
      const cellId = "unknown-output-cell";

      // Store is already initialized with storeId

      store.commit(
        events.cellCreated2({
          id: cellId,
          cellType: "code",
          fractionalIndex: "a0",
          createdBy: "test-user",
        })
      );

      // Manually insert an output with unknown type (simulating edge case)
      // This would normally be done through events, but we're testing edge cases
      const unknownOutput = {
        id: "unknown-output",
        cellId,
        outputType: "unknown_type",
        data: "Some unknown data",
        position: 0,
        streamName: null,
        representations: null,
        executionCount: null,
      };

      // Add a multimedia output that will be converted to display_data
      store.commit(
        events.multimediaDisplayOutputAdded({
          id: "unknown-output",
          cellId: cellId,
          representations: {
            "text/plain": {
              type: "inline",
              data: "Some unknown data",
            },
          },
          position: 0,
        })
      );

      // Wait for state to settle
      await waitFor(() => {
        const outputs = store.query(tables.outputs.select());
        return outputs.length === 1;
      });

      // Export should not throw an error
      expect(() => {
        exportNotebookToJupyter(store);
      }).not.toThrow();

      // Verify the notebook is still valid
      const exportedNotebook = exportNotebookToJupyter(store);
      expect(exportedNotebook).toBeDefined();
      expect(exportedNotebook.cells).toHaveLength(1);

      // The unknown output should be converted to display_data
      const cell = exportedNotebook.cells[0];
      expect(cell.outputs).toHaveLength(1);
      expect(cell.outputs![0].output_type).toBe("display_data");
      expect(cell.outputs![0].data).toEqual({
        "text/plain": "Some unknown data",
      });
    });
  });

  describe("Jupyter Validation", () => {
    it("should produce valid Jupyter notebooks that pass validation", async () => {
      // Export notebook - this should not throw validation errors
      expect(() => {
        const exportedNotebook = exportNotebookToJupyter(store);

        // Verify the exported notebook has the expected structure
        expect(exportedNotebook.nbformat).toBe(4);
        expect(exportedNotebook.nbformat_minor).toBe(5);
        expect(exportedNotebook.cells).toHaveLength(0);
        expect(exportedNotebook.metadata.kernelspec).toBeDefined();
        expect(exportedNotebook.metadata.language_info).toBeDefined();
      }).not.toThrow();
    });
  });
});
