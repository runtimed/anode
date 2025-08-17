/**
 * Generates a runtime command string for starting a Python runtime for a specific notebook.
 *
 * @param notebookId - The unique identifier for the notebook
 * @param customCommand - Optional custom runtime command from environment variable
 * @returns Complete runtime command with NOTEBOOK_ID prefix
 */
export function generateRuntimeCommand(
  notebookId: string,
  customCommand?: string
): string {
  const baseRuntimeCommand =
    customCommand ||
    'deno run --allow-all --env-file=.env "../runt/packages/pyodide-runtime-agent/src/mod.ts"';

  // Convert VITE_LIVESTORE_SYNC_URL to WebSocket URL
  const syncPath = import.meta.env.VITE_LIVESTORE_SYNC_URL || "/livestore";
  const wsUrl = syncPath.startsWith("ws")
    ? syncPath
    : `wss://${typeof window !== "undefined" ? window.location.host : "localhost"}${syncPath}`;

  return `NOTEBOOK_ID=${notebookId} LIVESTORE_SYNC_URL=${wsUrl} ${baseRuntimeCommand}`;
}

/**
 * Gets the runtime command for the current environment.
 * Uses VITE_RUNTIME_COMMAND environment variable if available,
 * otherwise falls back to the default Deno command.
 */
export function getRuntimeCommand(notebookId: string): string {
  const customCommand = import.meta.env.VITE_RUNTIME_COMMAND;
  return generateRuntimeCommand(notebookId, customCommand);
}
