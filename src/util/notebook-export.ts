import { tables, queryDb } from "@runtimed/schema";
import Ajv from "ajv";
import nbformatSchema from "@/data/nbformat-schema-v4.json";

/**
 * Jupyter Notebook (.ipynb) format interface
 */
export interface JupyterNotebook {
  cells: JupyterCell[];
  // TODO: Add metadata
  // metadata: {
  //   kernelspec: {
  //     display_name: string;
  //     language: string;
  //     name: string;
  //   };
  //   language_info: {
  //     name: string;
  //     version: string;
  //   };
  //   anode?: {
  //     exported_at: string;
  //     version: string;
  //   };
  // };
  nbformat: number;
  nbformat_minor: number;
}

export interface JupyterCell {
  cell_type: "code" | "markdown" | "raw";
  metadata: Record<string, any>;
  source: string | string[];
  execution_count?: number | null;
  outputs?: JupyterOutput[];
}

export interface JupyterOutput {
  output_type: "execute_result" | "display_data" | "stream" | "error";
  execution_count?: number | null;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  name?: string;
  text?: string | string[];
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

/**
 * Convert Anode cell type to Jupyter cell type
 */
function anodeCellTypeToJupyter(cellType: string): "code" | "markdown" | "raw" {
  switch (cellType) {
    case "code":
    case "sql":
    case "ai":
      return "code";
    case "markdown":
      return "markdown";
    case "raw":
      return "raw";
    default:
      return "code";
  }
}

const imageMimeTypes = ["image/png", "image/jpeg", "image/gif"];

// Initialize AJV validator with nbformat schema
const ajv = new Ajv();
// const validateNotebook = ajv.compile(nbformatSchema);

/**
 * Validate notebook against Jupyter nbformat schema
 */
function validateJupyterNotebook(notebook: JupyterNotebook): void {
  const result = ajv.validate(nbformatSchema, notebook);
  if (!result) {
    throw new Error(`Failed to export a valid ipynb notebook.`);
  }
}

/**
 * Convert Anode output to Jupyter output format
 */
function convertOutputToJupyter(output: any): JupyterOutput | null {
  const { outputType, data, representations } = output;

  // Handle different output types
  switch (outputType) {
    case "multimedia_display":
    case "multimedia_result":
      // Rich output with multiple representations
      if (representations) {
        const jupyterData: Record<string, any> = {};

        // Convert representations to Jupyter format
        for (const [mimeType, representation] of Object.entries(
          representations
        )) {
          if (
            representation &&
            typeof representation === "object" &&
            "data" in representation
          ) {
            const rep = representation as any;
            if (rep.type === "inline") {
              if (imageMimeTypes.includes(mimeType)) {
                jupyterData[mimeType] = `data:${mimeType};base64,${rep.data}`;
              } else {
                jupyterData[mimeType] = rep.data;
              }
              jupyterData[mimeType] = rep.data;
            } else if (rep.type === "artifact") {
              // TODO: Figure out what to do with artifacts. For now, we ignore them
              // In the future we could either include the artifact ID as metadata, or pull the artifact content and include it as inline data
            }
          }
        }

        return {
          output_type: "display_data",
          data: jupyterData,
          // metadata: jupyterMetadata,
          execution_count: output.executionCount || null,
        };
      }
      break;

    case "terminal_output": {
      // Terminal output (stdout/stderr)
      const streamName = output.streamName || "stdout";
      return {
        output_type: "stream",
        name: streamName,
        text: data || "",
        execution_count: output.executionCount || null,
      };
    }

    case "error":
      // Error output
      return {
        output_type: "error",
        ename: "Error",
        evalue: data || "Unknown error",
        traceback: [data || "Unknown error"],
        execution_count: output.executionCount || null,
      };

    case "ai_tool_call":
    case "ai_tool_result":
      // AI tool outputs - convert to display_data
      return {
        output_type: "display_data",
        data: {
          "text/plain": data || "",
          "application/json": JSON.stringify(
            {
              type: outputType,
              data: data,
            },
            null,
            2
          ),
        },
        execution_count: output.executionCount || null,
      };

    default:
      // Fallback for unknown output types
      return {
        output_type: "display_data",
        data: {
          "text/plain": data || "",
        },
        execution_count: output.executionCount || null,
      };
  }

  return null;
}

/**
 * Export notebook to Jupyter (.ipynb) format
 */
export function exportNotebookToJupyter(
  store: any,
  _notebookTitle: string = "Untitled"
): JupyterNotebook {
  // Get all cells ordered by fractional index
  const cells = store.query(
    queryDb(tables.cells.select().orderBy("fractionalIndex", "asc"))
  );

  // Get all outputs for all cells
  const allOutputs = store.query(
    queryDb(
      tables.outputs
        .select()
        .orderBy("cellId", "asc")
        .orderBy("position", "asc")
    )
  );

  // Group outputs by cell ID
  const outputsByCellId = new Map<string, any[]>();
  for (const output of allOutputs) {
    if (!outputsByCellId.has(output.cellId)) {
      outputsByCellId.set(output.cellId, []);
    }
    outputsByCellId.get(output.cellId)!.push(output);
  }

  // Convert cells to Jupyter format
  const jupyterCells: JupyterCell[] = cells.map((cell: any) => {
    const cellOutputs = outputsByCellId.get(cell.id) || [];
    const jupyterOutputs = cellOutputs
      .map(convertOutputToJupyter)
      .filter((output): output is JupyterOutput => output !== null);

    // Add "AI PROMPT: " prefix for AI cells and ensure each line is a comment
    const source =
      cell.cellType === "ai"
        ? (cell.source || "")
            .split("\n")
            .map((line: string, index: number) =>
              index === 0 ? `# AI PROMPT: ${line}` : `# ${line}`
            )
            .join("\n")
        : cell.source || "";

    return {
      cell_type: anodeCellTypeToJupyter(cell.cellType),
      metadata: {
        // anode: {
        //   cell_type: cell.cellType,
        //   id: cell.id,
        //   fractional_index: cell.fractionalIndex,
        //   created_by: cell.createdBy,
        //   execution_state: cell.executionState,
        //   source_visible: cell.sourceVisible,
        //   output_visible: cell.outputVisible,
        //   ai_context_visible: cell.aiContextVisible,
        // },
        // Add execution count if available
        ...(cell.executionCount && { execution_count: cell.executionCount }),
      },
      source: source,
      execution_count: cell.executionCount || null,
      outputs: jupyterOutputs.length > 0 ? jupyterOutputs : undefined,
    };
  });

  const notebook: JupyterNotebook = {
    cells: jupyterCells,
    // metadata: {
    //   kernelspec: {
    //     display_name: "Python 3",
    //     language: "python",
    //     name: "python3",
    //   },
    //   language_info: {
    //     name: "python",
    //     version: "3.10.0",
    //   },
    //   // anode: {
    //   //   exported_at: new Date().toISOString(),
    //   //   version: "1.0.0",
    //   // },
    // },
    nbformat: 4,
    nbformat_minor: 4,
  };

  // Validate the notebook against Jupyter nbformat schema
  validateJupyterNotebook(notebook);

  return notebook;
}

/**
 * Download notebook as .ipynb file
 */
export function downloadNotebookAsIpynb(
  notebook: JupyterNotebook,
  filename: string = "notebook.ipynb"
) {
  const jsonString = JSON.stringify(notebook, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ipynb") ? filename : `${filename}.ipynb`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
