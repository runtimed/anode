import { describe, expect, it } from "vitest";
import { groupConsecutiveStreamOutputs } from "../src/util/output-grouping.js";
import { OutputData } from "@/schema";

// Helper to create minimal test objects with only the fields the function uses
function createTerminalOutput(
  id: string,
  streamName: string,
  data: string,
  position: number
): OutputData {
  return {
    id,
    cellId: "cell1",
    outputType: "terminal",
    streamName,
    data,
    position,
    executionCount: null,
    displayId: null,
    artifactId: null,
    mimeType: null,
    metadata: null,
    representations: null,
  } as OutputData;
}

function createMultimediaOutput(
  id: string,
  outputType: "multimedia_display" | "multimedia_result",
  position: number
): OutputData {
  return {
    id,
    cellId: "cell1",
    outputType,
    position,
    streamName: null,
    executionCount: outputType === "multimedia_result" ? 1 : null,
    displayId: outputType === "multimedia_display" ? null : null,
    data: { "text/plain": { data: "test data", type: "inline" } },
    artifactId: null,
    mimeType: "text/plain",
    metadata: null,
    representations: null,
  } as any as OutputData;
}

describe("groupConsecutiveStreamOutputs", () => {
  it("should return empty array for empty input", () => {
    const result = groupConsecutiveStreamOutputs([]);
    expect(result).toEqual([]);
  });

  it("should leave non-stream outputs unchanged", () => {
    const outputs: OutputData[] = [
      createMultimediaOutput("1", "multimedia_display", 1),
      createMultimediaOutput("2", "multimedia_result", 2),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toEqual(outputs);
  });

  it("should concatenate consecutive stdout outputs", () => {
    const outputs: OutputData[] = [
      createTerminalOutput("1", "stdout", "Hello ", 1),
      createTerminalOutput("2", "stdout", "World", 2),
      createTerminalOutput("3", "stdout", "!", 3),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      createTerminalOutput("1", "stdout", "Hello World!", 1)
    );
  });

  it("should concatenate consecutive stderr outputs", () => {
    const outputs: OutputData[] = [
      createTerminalOutput("1", "stderr", "Error 1 ", 1),
      createTerminalOutput("2", "stderr", "Error 2", 2),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      createTerminalOutput("1", "stderr", "Error 1 Error 2", 1)
    );
  });

  it("should not concatenate stdout and stderr outputs", () => {
    const outputs: OutputData[] = [
      createTerminalOutput("1", "stdout", "stdout line", 1),
      createTerminalOutput("2", "stderr", "stderr line", 2),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(2);
    expect(result[0].data).toBe("stdout line");
    expect(result[1].data).toBe("stderr line");
  });

  it("should handle mixed output types correctly", () => {
    const multimediaOutput: OutputData = {
      id: "3",
      cellId: "cell1",
      outputType: "multimedia_display",
      position: 3,
      streamName: null,
      executionCount: null,
      displayId: null,
      data: "<div>Chart</div>",
      artifactId: null,
      mimeType: "text/html",
      metadata: null,
      representations: {
        "text/html": { type: "inline", data: "<div>Chart</div>" },
      },
    };

    const outputs: OutputData[] = [
      createTerminalOutput("1", "stdout", "Line 1\n", 1),
      createTerminalOutput("2", "stdout", "Line 2\n", 2),
      multimediaOutput,
      createTerminalOutput("4", "stderr", "Error 1\n", 4),
      createTerminalOutput("5", "stderr", "Error 2\n", 5),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(3);

    // First group: stdout lines 1-2 concatenated
    expect(result[0]).toEqual(
      createTerminalOutput("1", "stdout", "Line 1\nLine 2\n", 1)
    );

    // Second item: display data (unchanged)
    expect(result[1]).toEqual(multimediaOutput);

    // Third group: stderr lines 4-5 concatenated
    expect(result[2]).toEqual(
      createTerminalOutput("4", "stderr", "Error 1\nError 2\n", 4)
    );
  });

  it("should handle stdout followed by stderr followed by stdout", () => {
    const outputs: OutputData[] = [
      createTerminalOutput("1", "stdout", "stdout 1\n", 1),
      createTerminalOutput("2", "stdout", "stdout 2\n", 2),
      createTerminalOutput("3", "stderr", "stderr 1\n", 3),
      createTerminalOutput("4", "stderr", "stderr 2\n", 4),
      createTerminalOutput("5", "stdout", "stdout 3\n", 5),
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(3);

    // First group: stdout
    expect(result[0].data).toBe("stdout 1\nstdout 2\n");

    // Second group: stderr
    expect(result[1].data).toBe("stderr 1\nstderr 2\n");

    // Third group: stdout again
    expect(result[2].data).toBe("stdout 3\n");
  });

  it("should handle single stream output", () => {
    const output: OutputData = {
      ...createTerminalOutput("1", "stdout", "Line 1\n", 1),
      metadata: { timestamp: "2023-01-01T00:00:00Z" },
    };
    const outputs: OutputData[] = [output];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(output);
  });

  it("should preserve metadata and other properties", () => {
    const output1: OutputData = {
      ...createTerminalOutput("1", "stdout", "Part 1 ", 1),
      metadata: { timestamp: "2023-01-01T00:00:00Z" },
    };

    const output2: OutputData = {
      ...createTerminalOutput("2", "stdout", "Part 2", 2),
      metadata: { timestamp: "2023-01-01T00:00:01Z" },
    };

    const outputs: OutputData[] = [output1, output2];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);

    const expected: OutputData = {
      ...createTerminalOutput("1", "stdout", "Part 1 Part 2", 1),
      metadata: { timestamp: "2023-01-01T00:00:00Z" },
    };

    expect(result[0]).toEqual(expected);
  });
});
