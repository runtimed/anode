import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { PyodideRuntimeAgent } from "@runtimed/pyodide-runtime";

/**
 * Creates a CodeMirror completion source that provides Python autocompletion
 * using the Pyodide runtime agent's IPython completer.
 */
export function createPythonCompletionSource(
  getRuntimeAgent: () => PyodideRuntimeAgent | null
) {
  return async (
    context: CompletionContext
  ): Promise<CompletionResult | null> => {
    const agent = getRuntimeAgent();

    // Only provide completions if we have an active Python runtime
    if (!agent || !agent.isRunning()) {
      return null;
    }

    // Don't complete if we're in the middle of a word that's already long
    // This helps avoid too many completion requests while typing
    const word = context.matchBefore(/\w*/);
    if (word && word.from === word.to && !context.explicit) {
      return null;
    }

    const code = context.state.doc.toString();
    const pos = context.pos;

    try {
      const result = await agent.getCompletions(code, pos);

      // Return null if no completions available
      if (!result.matches || result.matches.length === 0) {
        return null;
      }

      return {
        from: result.cursor_start,
        to: result.cursor_end,
        options: result.matches.map((match) => ({
          label: match,
          type: "variable", // TODO: Could be enhanced with proper type detection
          boost: 0, // Default boost
        })),
      };
    } catch (error) {
      // Log for debugging but don't show errors to user
      console.debug("Python completion failed:", error);
      return null;
    }
  };
}

/**
 * Debounced version of the Python completion source to avoid overwhelming
 * the runtime with too many completion requests.
 */
export function createDebouncedPythonCompletionSource(
  getRuntimeAgent: () => PyodideRuntimeAgent | null,
  debounceMs: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastContext: CompletionContext | null = null;
  let lastPromise: Promise<CompletionResult | null> | null = null;

  const baseSource = createPythonCompletionSource(getRuntimeAgent);

  return async (
    context: CompletionContext
  ): Promise<CompletionResult | null> => {
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // If this is the same context as last time and we have a promise, reuse it
    if (
      lastContext &&
      lastContext.pos === context.pos &&
      lastContext.state.doc.toString() === context.state.doc.toString() &&
      lastPromise
    ) {
      return lastPromise;
    }

    lastContext = context;

    // Create a debounced promise
    lastPromise = new Promise<CompletionResult | null>((resolve) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await baseSource(context);
          resolve(result);
        } catch (error) {
          console.debug("Debounced Python completion failed:", error);
          resolve(null);
        }
        timeoutId = null;
        lastPromise = null;
        lastContext = null;
      }, debounceMs);
    });

    return lastPromise;
  };
}
