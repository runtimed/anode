import { describe, it, expect } from "vitest";
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
        outputType: "stream",
        data: { name: "stdout", text: "Hello " },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "World" },
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "!" },
        metadata: null,
        position: 3,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "stream",
      data: { name: "stdout", text: "Hello World!" },
      metadata: null,
      position: 1,
    });
  });

  it("should concatenate consecutive stderr outputs", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stderr", text: "Error: " },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stderr", text: "Something went wrong" },
        metadata: null,
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "stream",
      data: { name: "stderr", text: "Error: Something went wrong" },
      metadata: null,
      position: 1,
    });
  });

  it("should not concatenate stdout and stderr outputs", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Hello" },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stderr", text: "Error" },
        metadata: null,
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(2);
    expect(result[0].data).toEqual({ name: "stdout", text: "Hello" });
    expect(result[1].data).toEqual({ name: "stderr", text: "Error" });
  });

  it("should handle mixed output types correctly", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Line 1\n" },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Line 2\n" },
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "display_data",
        data: { "text/plain": "Some output" },
        metadata: null,
        position: 3,
      },
      {
        id: "4",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Line 3\n" },
        metadata: null,
        position: 4,
      },
      {
        id: "5",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Line 4\n" },
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
      outputType: "stream",
      data: { name: "stdout", text: "Line 1\nLine 2\n" },
      metadata: null,
      position: 1,
    });

    // Middle: display_data unchanged
    expect(result[1]).toEqual({
      id: "3",
      cellId: "cell1",
      outputType: "display_data",
      data: { "text/plain": "Some output" },
      metadata: null,
      position: 3,
    });

    // Last group: stdout lines 3-4 concatenated
    expect(result[2]).toEqual({
      id: "4",
      cellId: "cell1",
      outputType: "stream",
      data: { name: "stdout", text: "Line 3\nLine 4\n" },
      metadata: null,
      position: 4,
    });
  });

  it("should handle stdout followed by stderr followed by stdout", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Out 1\n" },
        metadata: null,
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Out 2\n" },
        metadata: null,
        position: 2,
      },
      {
        id: "3",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stderr", text: "Error 1\n" },
        metadata: null,
        position: 3,
      },
      {
        id: "4",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stderr", text: "Error 2\n" },
        metadata: null,
        position: 4,
      },
      {
        id: "5",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Out 3\n" },
        metadata: null,
        position: 5,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(3);

    // First group: stdout
    expect(result[0].data).toEqual({ name: "stdout", text: "Out 1\nOut 2\n" });

    // Second group: stderr
    expect(result[1].data).toEqual({
      name: "stderr",
      text: "Error 1\nError 2\n",
    });

    // Third group: stdout again
    expect(result[2].data).toEqual({ name: "stdout", text: "Out 3\n" });
  });

  it("should handle single stream output", () => {
    const outputs: OutputData[] = [
      {
        id: "1",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "Single line" },
        metadata: null,
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
        outputType: "stream",
        data: { name: "stdout", text: "Hello " },
        metadata: { someKey: "someValue" },
        position: 1,
      },
      {
        id: "2",
        cellId: "cell1",
        outputType: "stream",
        data: { name: "stdout", text: "World" },
        metadata: { otherKey: "otherValue" },
        position: 2,
      },
    ];

    const result = groupConsecutiveStreamOutputs(outputs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      cellId: "cell1",
      outputType: "stream",
      data: { name: "stdout", text: "Hello World" },
      metadata: { someKey: "someValue" }, // Takes metadata from first output
      position: 1,
    });
  });
});
