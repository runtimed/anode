/**
 * Generates a runtime command string for starting a Python runtime for a specific notebook.
 *
 * @param notebookId - The unique identifier for the notebook
 * @param customCommand - Optional custom runtime command from environment variable
 * @returns Complete runtime command with NOTEBOOK_ID properly positioned
 */
export function generateRuntimeCommand(
  notebookId: string,
  customCommand?: string
): string {
  const baseRuntimeCommand =
    customCommand ||
    'deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.7.3"';

  // If the command starts with 'cd', place NOTEBOOK_ID after the cd command
  if (baseRuntimeCommand.startsWith('cd ')) {
    // Find the position after 'cd ... &&'
    const cdMatch = baseRuntimeCommand.match(/^cd\s+[^&]*&&\s*/);
    if (cdMatch) {
      const cdPart = cdMatch[0];
      const remainingCommand = baseRuntimeCommand.slice(cdPart.length);
      return `${cdPart}NOTEBOOK_ID=${notebookId} ${remainingCommand}`;
    }
  }

  // Default behavior: NOTEBOOK_ID at the beginning
  return `NOTEBOOK_ID=${notebookId} ${baseRuntimeCommand}`;
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
