import { isStreamOutput, OutputData, StreamOutputData } from "@runt/schema";

/**
 * Groups consecutive stream outputs of the same type (stdout/stderr) and concatenates their text.
 * Other output types are left unchanged.
 *
 * @param outputs - Array of output data objects sorted by position
 * @returns Array with consecutive stream outputs of the same type merged into single outputs
 */
export function groupConsecutiveStreamOutputs(
  outputs: OutputData[],
): OutputData[] {
  if (outputs.length === 0) return outputs;

  const result: OutputData[] = [];
  let i = 0;

  while (i < outputs.length) {
    const currentOutput = outputs[i];

    // If it's not a stream output, just add it as-is
    if (
      currentOutput.outputType !== "stream" ||
      !isStreamOutput(currentOutput.data)
    ) {
      result.push(currentOutput);
      i++;
      continue;
    }

    // It's a stream output - look for consecutive stream outputs of the same type
    const streamData = currentOutput.data as StreamOutputData;
    const streamType = streamData.name;
    const textParts: string[] = [streamData.text];
    let j = i + 1;

    // Collect consecutive stream outputs of the same type
    while (j < outputs.length) {
      const nextOutput = outputs[j];

      if (
        nextOutput.outputType !== "stream" || !isStreamOutput(nextOutput.data)
      ) {
        break;
      }

      const nextStreamData = nextOutput.data as StreamOutputData;
      if (nextStreamData.name !== streamType) {
        break;
      }

      textParts.push(nextStreamData.text);
      j++;
    }

    // Create the merged output
    const mergedOutput: OutputData = {
      ...currentOutput,
      data: {
        name: streamType,
        text: textParts.join(""),
      },
    };

    result.push(mergedOutput);
    i = j; // Skip all the outputs we just merged
  }

  return result;
}
