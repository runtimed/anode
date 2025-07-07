import { describe, expect, it } from "vitest";
import { groupConsecutiveStreamOutputs } from "../src/util/output-grouping.js";
import { OutputData } from "@runt/schema";

describe("groupConsecutiveStreamOutputs", () => {
  it("should return empty array for empty input", () => {
    const result = groupConsecutiveStreamOutputs([]);
    expect(result).toEqual([]);
  });

  it("should leave non-stream outputs unchanged", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "display_data",
        data: { "text/plain": "Hello" },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "execute_result",
        data: { "text/plain": "World" },
        metadata: null,
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toEqual(outputs);
  });

  it("should concatenate consecutive stdout outputs", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Hello ",
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "World",
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "!",
        metadata: null,
        position: 3,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "terminal",
      streamName: "stdout",
      data: "Hello World!",
      metadata: null,
      position: 1,
    });
  });

  it("should concatenate consecutive stderr outputs", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "Error 1 ",
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "Error 2",
        metadata: null,
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "terminal",
      streamName: "stderr",
      data: "Error 1 Error 2",
      metadata: null,
      position: 1,
    });
  });

  it("should not concatenate stdout and stderr outputs", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "stdout line",
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "stderr line",
        metadata: null,
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(2);
    expect(result[0].data).toBe("stdout line");
    expect(result[1].data).toBe("stderr line");
  });

  it("should handle mixed output types correctly", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Line 1\n",
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Line 2\n",
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "multimedia_display",
        data: null,
        representations: {
          "text/html": { type: "inline", data: "<div>Chart</div>" },
        },
        metadata: null,
        position: 3,
      },
      {
        id: "4",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "Error 1\n",
        metadata: null,
        position: 4,
      },
      {
        id: "5",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "Error 2\n",
        metadata: null,
        position: 5,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(3);

    // First group: stdout lines 1-2 concatenated
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "terminal",
      streamName: "stdout",
      data: "Line 1\nLine 2\n",
      metadata: null,
      position: 1,
    });

    // Second item: display data (unchanged)
    expect(result[1]).toEqual({
      id: "3",
      cellId: "cell1",
      outputType: "multimedia_display",
      data: null,
      representations: {
        "text/html": { type: "inline", data: "<div>Chart</div>" },
      },
      metadata: null,
      position: 3,
    });

    // Third group: stderr lines 4-5 concatenated
    expect(result[2]).toEqual({
      id: "4",
      cellId: "cell1",
      outputType: "terminal",
      streamName: "stderr",
      data: "Error 1\nError 2\n",
      metadata: null,
      position: 4,
    });
  });

  it("should handle stdout followed by stderr followed by stdout", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "stdout 1\n",
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "stdout 2\n",
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "stderr 1\n",
        metadata: null,
        position: 3,
      },
      {
        id: "4",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stderr",
        data: "stderr 2\n",
        metadata: null,
        position: 4,
      },
      {
        id: "5",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "stdout 3\n",
        metadata: null,
        position: 5,
      },
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
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Line 1\n",
        metadata: { timestamp: "2023-01-01T00:00:00Z" },
        position: 1,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(outputs[0]);
  });

  it("should preserve metadata and other properties", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Part 1 ",
        metadata: { timestamp: "2023-01-01T00:00:00Z" },
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "terminal",
        streamName: "stdout",
        data: "Part 2",
        metadata: { timestamp: "2023-01-01T00:00:01Z" },
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "terminal",
      streamName: "stdout",
      data: "Part 1 Part 2",
      metadata: { timestamp: "2023-01-01T00:00:00Z" },
      position: 1,
    });
  });
});
