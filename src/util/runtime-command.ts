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
    'deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.7.3"';

  return `NOTEBOOK_ID=${notebookId} RUNT_API_KEY=your-key ${baseRuntimeCommand}`;
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
