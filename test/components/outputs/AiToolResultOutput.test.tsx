import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AiToolResultOutput } from "../../../src/components/outputs/AiToolResultOutput";

describe("AiToolResultOutput", () => {
  it("renders success result correctly", () => {
    const resultData = {
      tool_call_id: "call_123",
      result: "Created code cell: cell-abc123",
      status: "success",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    expect(
      screen.getByText("Created code cell: cell-abc123")
    ).toBeInTheDocument();
  });

  it("renders error result correctly", () => {
    const resultData = {
      tool_call_id: "call_456",
      result: "Failed to create cell: Invalid parameters",
      status: "error",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    expect(
      screen.getByText("Failed to create cell: Invalid parameters")
    ).toBeInTheDocument();
  });

  it("renders pending result correctly", () => {
    const resultData = {
      tool_call_id: "call_789",
      result: "Processing request...",
      status: "pending",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    expect(screen.getByText("Processing request...")).toBeInTheDocument();
  });

  it("renders without result text when result is undefined", () => {
    const resultData = {
      tool_call_id: "call_empty",
      status: "success",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    // Should not render anything when result is undefined
    expect(screen.queryByText("Created code cell")).not.toBeInTheDocument();
  });

  it("renders unknown status with default config", () => {
    const resultData = {
      tool_call_id: "call_unknown",
      result: "Unknown status result",
      status: "unknown",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    expect(screen.getByText("Unknown status result")).toBeInTheDocument();
  });

  it("preserves whitespace in result text", () => {
    const resultData = {
      tool_call_id: "call_multiline",
      result: "Line 1\nLine 2\n  Indented line",
      status: "success",
    };

    render(<AiToolResultOutput resultData={resultData} />);

    const resultElement = screen.getByText((content, element) => {
      return (
        element?.textContent === "Line 1\nLine 2\n  Indented line" &&
        element?.className.includes("whitespace-pre-wrap")
      );
    });
    expect(resultElement).toHaveClass("whitespace-pre-wrap");
  });
});
