import {
  type CellData,
  cellReferences$,
  createCellBetween,
  events,
  tables,
} from "@runtimed/schema";

import type { Store } from "@runtimed/schema";
import { logger } from "@runtimed/agent-core";

export interface NotebookTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

interface ToolParameter {
  type: string;
  enum?: string[];
  description?: string;
  default?: string;
  items?: ToolParameter; // For array types
  properties?: Record<string, ToolParameter>; // For object types
  required?: string[]; // For object types
}

// Define basic notebook tools (always available)
const BASIC_NOTEBOOK_TOOLS: NotebookTool[] = [
  {
    name: "create_cell",
    description:
      "Create a new cell in the notebook after a specific cell. " +
      "The AI knows its own cell ID and can reference any previously created cell IDs.",
    parameters: {
      type: "object",
      properties: {
        cellType: {
          type: "string",
          enum: ["code", "markdown", "ai", "sql"],
          description:
            "The type of cell to create (defaults to 'code' if not specified)",
        },
        source: {
          type: "string",
          description: "The content/source code for the cell",
        },
        after_id: {
          type: "string",
          description:
            "The ID of the cell to place this new cell after. " +
            "Use your own cell ID to place cells below yourself, " +
            "or use a previously created cell's ID to build sequences.",
        },
      },
      required: ["source", "after_id"],
    },
  },
  {
    name: "modify_cell",
    description:
      "Modify the content of an existing cell in the notebook. " +
      "Use this to fix bugs, improve code, or update content based on user feedback. " +
      "Use the actual cell ID from the context (shown as 'ID: cell-xxx'), not position numbers.",
    parameters: {
      type: "object",
      properties: {
        cellId: {
          type: "string",
          description:
            "The actual cell ID from the context " +
            "(e.g., 'cell-1234567890-abc'), not a position number",
        },
        source: {
          type: "string",
          description: "The new content/source code for the cell",
        },
      },
      required: ["cellId", "source"],
    },
  },
  {
    name: "execute_cell",
    description:
      "Execute a specific cell in the notebook. " +
      "Use this to run code after creating or modifying it, or to re-run existing cells. " +
      "Use the actual cell ID from the context (shown as 'ID: cell-xxx'), not position numbers.",
    parameters: {
      type: "object",
      properties: {
        cellId: {
          type: "string",
          description:
            "The actual cell ID from the context " +
            "(e.g., 'cell-1234567890-abc'), not a position number",
        },
      },
      required: ["cellId"],
    },
  },
];

// Combined notebook tools
const NOTEBOOK_TOOLS = [...BASIC_NOTEBOOK_TOOLS];

/**
 * Get all available tools including both notebook tools and MCP tools
 */
export async function getAllTools(): Promise<NotebookTool[]> {
  const notebookTools = [...BASIC_NOTEBOOK_TOOLS];

  return notebookTools;
}

/**
 * Get only the notebook tools (for backward compatibility)
 */
export const NOTEBOOK_TOOLS_EXPORT = NOTEBOOK_TOOLS;

export function createCell(
  store: Store,
  sessionId: string,
  _currentCell: CellData,
  args: Record<string, unknown>
) {
  const cellType = String(args.cellType || "code");
  const content = String(args.source || args.content || ""); // Check source first, then content
  const afterId = String(args.after_id); // Now required

  // Get ordered cells with fractional indices
  const cellList = store.query(cellReferences$);

  // Find the cell to insert after
  const afterCellIndex = cellList.findIndex((c) => c.id === afterId);
  if (afterCellIndex === -1) {
    throw new Error(`Cell with ID ${afterId} not found`);
  }

  // Generate unique cell ID
  const newCellId = `cell-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const cellBefore = cellList[afterCellIndex]!; // Safe because we checked afterCellIndex !== -1
  const cellAfter =
    afterCellIndex < cellList.length - 1
      ? cellList[afterCellIndex + 1] || null
      : null;

  logger.info("Creating cell via AI tool call", {
    cellType,
    afterId,
    contentLength: content.length,
    cellBefore: cellBefore?.id,
    cellAfter: cellAfter?.id,
  });

  // Create the new cell with fractional index
  const createResult = createCellBetween(
    {
      id: newCellId,
      cellType: cellType as "code" | "markdown" | "raw" | "sql" | "ai",
      createdBy: `ai-assistant-${sessionId}`,
    },
    cellBefore,
    cellAfter,
    cellList
  );

  // Commit all events (may include rebalancing)
  createResult.events.forEach((event) => store.commit(event));

  // Set the cell source if provided
  if (content.length > 0) {
    store.commit(
      events.cellSourceChanged({
        id: newCellId,
        source: content,
        modifiedBy: `ai-assistant-${sessionId}`,
      })
    );
  }

  logger.info("Created cell successfully", {
    cellId: newCellId,
    contentPreview: content.slice(0, 100),
  });

  return `Created ${cellType} cell: ${newCellId}`;
}

/**
 * Handle tool calls from AI with result return
 */
export async function handleToolCallWithResult(
  store: Store,
  sessionId: string,
  currentCell: CellData,
  toolCall: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  },
  sendWorkerMessage?: (type: string, data: unknown) => Promise<unknown>
): Promise<string> {
  const { name, arguments: args } = toolCall;

  // Validate tool parameters against schema
  try {
    // Get all available tools to find the definition
    const allTools = await getAllTools();
    const toolDef = allTools.find((tool) => tool.name === name);

    if (toolDef && toolDef.parameters?.required) {
      const missingParams = toolDef.parameters.required.filter(
        (param: string) => !(param in args)
      );

      if (missingParams.length > 0) {
        const errorMessage = `Missing required parameters: ${missingParams.join(
          ", "
        )}`;
        logger.error("Tool call validation failed", {
          toolName: name,
          missingParams,
          providedArgs: Object.keys(args),
        });
        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    // If validation fails, log and re-throw
    if (
      error instanceof Error &&
      error.message.includes("Missing required parameters")
    ) {
      throw error;
    }
    logger.warn("Could not validate tool parameters", {
      toolName: name,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Check if tool requires approval - only external tools require approval
  const isBuiltInTool = NOTEBOOK_TOOLS.some((tool) => tool.name === name);
  const requiresApproval = !isBuiltInTool;

  if (requiresApproval) {
    // Check if we already have an approval for this specific tool call
    let existingApproval = store.query(
      tables.toolApprovals.select().where({ toolCallId: toolCall.id })
    )[0];

    // If no specific approval, check for a blanket "always" approval for this tool
    if (!existingApproval) {
      const alwaysApprovals = store.query(
        tables.toolApprovals.select().where({
          toolName: name,
          status: "approved_always",
        })
      );

      if (alwaysApprovals.length > 0) {
        // Use the blanket approval
        existingApproval = alwaysApprovals[0];
      }
    }

    if (!existingApproval || existingApproval.status === "pending") {
      // Request approval if we don't have one
      if (!existingApproval) {
        logger.info("Requesting tool approval", {
          toolName: name,
          toolCallId: toolCall.id,
        });

        store.commit(
          events.toolApprovalRequested({
            toolCallId: toolCall.id,
            cellId: currentCell.id,
            toolName: name,
            arguments: args,
            requestedAt: new Date(),
          })
        );
      }

      // Wait for approval with polling
      const approvalPromise = new Promise<string>((resolve, reject) => {
        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          if (pollInterval) clearInterval(pollInterval);
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(
            new Error(`Tool approval timeout after 60 seconds for ${name}`)
          );
        }, 60000); // 60 second timeout

        // Poll for approval status
        const pollInterval = setInterval(() => {
          const approval = store.query(
            tables.toolApprovals.select().where({ toolCallId: toolCall.id })
          )[0];

          if (approval && approval.status !== "pending") {
            cleanup();

            if (approval.status === "denied") {
              reject(new Error(`Tool call denied by user: ${name}`));
              return;
            }

            if (
              approval.status === "approved_once" ||
              approval.status === "approved_always"
            ) {
              resolve("approved");
              return;
            }
          }
        }, 500); // Poll every 500ms
      });

      try {
        await approvalPromise;
      } catch (error) {
        logger.error("Tool approval failed", { toolName: name, error });
        throw error;
      }
    } else if (existingApproval.status === "denied") {
      logger.warn("Tool call denied by previous approval", { toolName: name });
      throw new Error(`Tool call denied: ${name}`);
    }

    logger.info("Tool approved, proceeding with execution", { toolName: name });
  }

  // Handle built-in notebook tools
  switch (name) {
    case "create_cell": {
      return createCell(store, sessionId, currentCell, args);
    }

    case "modify_cell": {
      const cellId = String(args.cellId || "");
      const rawContent = String(args.source || args.content || "");
      const content = unescapeContent(rawContent); // Process escaped characters

      if (!cellId) {
        logger.error("modify_cell: cellId is required");
        throw new Error("modify_cell: cellId is required");
      }

      // Check if cell exists
      const existingCell = store.query(
        tables.cells.select().where({ id: cellId })
      )[0];

      if (!existingCell) {
        logger.error("modify_cell: Cell not found", { cellId });
        throw new Error(`modify_cell: Cell not found: ${cellId}`);
      }

      logger.info("Modifying cell via AI tool call", {
        cellId,
        contentLength: content.length,
      });

      // Update the cell source
      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: content,
          modifiedBy: `ai-assistant-${sessionId}`,
        })
      );

      logger.info("Modified cell successfully", {
        cellId,
        contentPreview: content.slice(0, 100),
      });

      return `Modified cell ${cellId} with ${content.length} characters`;
    }

    case "execute_cell": {
      const cellId = String(args.cellId || "");

      if (!cellId) {
        logger.error("execute_cell: cellId is required");
        throw new Error("execute_cell: cellId is required");
      }

      // Check if cell exists and is executable
      const existingCell = store.query(
        tables.cells.select().where({ id: cellId })
      )[0];

      if (!existingCell) {
        logger.error("execute_cell: Cell not found", { cellId });
        throw new Error(`execute_cell: Cell not found: ${cellId}`);
      }

      if (existingCell.cellType !== "code") {
        logger.error("execute_cell: Only code cells can be executed", {
          cellId,
          cellType: existingCell.cellType,
        });
        throw new Error(
          `execute_cell: Only code cells can be executed, got ${existingCell.cellType}`
        );
      }

      logger.info("Executing cell via AI tool call", { cellId });

      const queueId = `exec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      // Set up execution completion monitoring with polling
      const executionCompletePromise = new Promise<string>(
        (resolve, reject) => {
          const cleanup = () => {
            if (timeout) clearTimeout(timeout);
            if (pollInterval) clearInterval(pollInterval);
          };

          const timeout = setTimeout(() => {
            cleanup();
            reject(
              new Error(`Execution timeout after 30 seconds for cell ${cellId}`)
            );
          }, 30000);

          // Poll execution status
          const pollInterval = setInterval(() => {
            const executionEntry = store.query(
              tables.executionQueue.select().where({ id: queueId })
            )[0];

            if (!executionEntry) return;

            if (
              executionEntry.status === "completed" ||
              executionEntry.status === "failed"
            ) {
              cleanup();

              if (executionEntry.status === "failed") {
                reject(new Error(`Execution failed for cell ${cellId}`));
                return;
              }

              // Get cell outputs after execution
              const outputs = store.query(
                tables.outputs
                  .select()
                  .where({ cellId })
                  .orderBy("position", "asc")
              );

              // Format outputs for AI consumption
              let outputSummary = `Cell ${cellId} executed successfully`;

              if (outputs.length > 0) {
                const outputTexts: string[] = [];

                for (const output of outputs) {
                  if (output.outputType === "terminal" && output.data) {
                    outputTexts.push(`Output: ${String(output.data).trim()}`);
                  } else if (output.outputType === "multimedia_result") {
                    // Try to get text representation from representations or fallback to data
                    // Prioritize markdown for AI context, then plain text
                    let resultText = "";
                    let usedFormat = "";

                    logger.debug(
                      "Processing multimedia_result for tool response",
                      {
                        cellId,
                        hasRepresentations: !!output.representations,
                        representationKeys: output.representations
                          ? Object.keys(output.representations)
                          : [],
                        hasData: !!output.data,
                      }
                    );

                    if (
                      output.representations &&
                      output.representations["text/markdown"]
                    ) {
                      const container = output.representations["text/markdown"];
                      if (container.type === "inline") {
                        resultText = String(container.data || "");
                        usedFormat = "text/markdown";
                      }
                    } else if (
                      output.representations &&
                      output.representations["text/plain"]
                    ) {
                      const container = output.representations["text/plain"];
                      if (container.type === "inline") {
                        resultText = String(container.data || "");
                        usedFormat = "text/plain";
                      }
                    } else if (output.data) {
                      resultText = String(output.data);
                      usedFormat = "raw_data";
                    }

                    logger.debug("Tool result content extracted", {
                      cellId,
                      usedFormat,
                      contentLength: resultText.length,
                      fullContent: resultText,
                    });

                    if (resultText) {
                      outputTexts.push(`Result: ${resultText.trim()}`);
                    }
                  } else if (output.outputType === "error" && output.data) {
                    try {
                      const errorData =
                        typeof output.data === "string"
                          ? JSON.parse(output.data)
                          : output.data;
                      outputTexts.push(
                        `Error: ${errorData.ename}: ${errorData.evalue}`
                      );
                    } catch {
                      outputTexts.push(`Error: ${String(output.data)}`);
                    }
                  }
                }

                if (outputTexts.length > 0) {
                  outputSummary += `. ${outputTexts.join(". ")}`;
                }
              }

              resolve(outputSummary);
            }
          }, 500); // Poll every 500ms
        }
      );

      // Request execution for the cell
      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: (existingCell.executionCount || 0) + 1,
          requestedBy: `ai-assistant-${sessionId}`,
        })
      );

      logger.info("Execution requested for cell, waiting for completion", {
        cellId,
        queueId,
      });

      // Wait for execution to complete and return the result
      return await executionCompletePromise;
    }

    default:
      // Handle unknown tools via Python worker if available
      if (sendWorkerMessage) {
        logger.info("Calling registered Python tool via worker", {
          toolName: name,
          argsKeys: Object.keys(args),
        });

        try {
          const result = await sendWorkerMessage("run_registered_tool", {
            toolName: name,
            args: args,
          });

          logger.info("Python tool executed successfully", {
            toolName: name,
            result,
          });

          return `Tool ${name} executed successfully: ${String(result)}`;
        } catch (error) {
          logger.error("Python tool execution failed", {
            toolName: name,
            error: String(error),
          });
          throw new Error(`Failed to execute tool ${name}: ${String(error)}`);
        }
      } else {
        logger.warn("Unknown AI tool and no worker available", {
          toolName: name,
        });
        throw new Error(`Unknown tool: ${name}`);
      }
  }
}
