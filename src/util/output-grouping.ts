import { OutputData } from "@runt/schema";

/**
 * Groups consecutive terminal outputs of the same type (stdout/stderr) into single outputs
 * This improves readability by avoiding fragmented terminal output
 * @param outputs - Array of output data objects sorted by position
 * @returns Array with consecutive terminal outputs of the same type merged into single outputs
 */
function isTerminalOutput(output: OutputData): boolean {
  return output.outputType === "terminal" && typeof output.data === "string";
}

export function groupConsecutiveStreamOutputs(
  outputs: OutputData[]
): OutputData[] {
  const result: OutputData[] = [];

  for (let i = 0; i < outputs.length; i++) {
    const currentOutput = outputs[i];

    // If it's not a terminal output, just add it as-is
    if (!isTerminalOutput(currentOutput)) {
      result.push(currentOutput);
      continue;
    }

    // Start collecting consecutive terminal outputs of the same stream type
    const currentStreamName = currentOutput.streamName;
    const textParts = [currentOutput.data as string];

    // Look ahead for more consecutive terminal outputs of the same type
    let j = i + 1;
    while (j < outputs.length) {
      const nextOutput = outputs[j];

      if (!isTerminalOutput(nextOutput)) {
        break;
      }

      // Only group outputs of the same stream type (stdout/stderr)
      if (nextOutput.streamName !== currentStreamName) {
        break;
      }

      textParts.push(nextOutput.data as string);
      j++;
    }

    // Create the merged output with concatenated text
    const mergedOutput: OutputData = {
      ...currentOutput,
      data: textParts.join(""),
    };

    result.push(mergedOutput);
    i = j - 1; // Skip all the outputs we just merged (will be incremented by for loop)
  }

  return result;
}
