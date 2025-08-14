import { describe, expect, it } from "vitest";
import {
  generateRuntimeCommand,
  getRuntimeCommand,
} from "../src/util/runtime-command.js";

describe("Runtime Command Generation", () => {
  it("should use default runtime command when no custom command is provided", () => {
    const notebookId = "test-notebook-123";
    const runtimeCommand = generateRuntimeCommand(notebookId);

    expect(runtimeCommand).toBe(
      'NOTEBOOK_ID=test-notebook-123 RUNT_API_KEY=your-key deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.7.3"'
    );
  });

  it("should use environment variable through getRuntimeCommand", () => {
    const notebookId = "env-test-notebook";
    const runtimeCommand = getRuntimeCommand(notebookId);

    // Should contain the notebook ID prefix
    expect(runtimeCommand).toMatch(/^NOTEBOOK_ID=env-test-notebook /);
    // Should contain some runtime command (either custom from env or default)
    expect(runtimeCommand.length).toBeGreaterThan(
      "NOTEBOOK_ID=env-test-notebook ".length
    );
  });

  it("should use custom runtime command when provided", () => {
    const customCommand = "python -m my_custom_runtime";
    const notebookId = "test-notebook-456";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toBe(
      "NOTEBOOK_ID=test-notebook-456 RUNT_API_KEY=your-key python -m my_custom_runtime"
    );
  });

  it("should handle development environment runtime command", () => {
    const devCommand = "pnpm dev:runtime";
    const notebookId = "dev-notebook-789";
    const runtimeCommand = generateRuntimeCommand(notebookId, devCommand);

    expect(runtimeCommand).toBe(
      "NOTEBOOK_ID=dev-notebook-789 RUNT_API_KEY=your-key pnpm dev:runtime"
    );
  });

  it("should handle notebook IDs with special characters", () => {
    const notebookId = "notebook-with-dashes_and_underscores.123";
    const runtimeCommand = generateRuntimeCommand(notebookId);

    expect(runtimeCommand).toBe(
      'NOTEBOOK_ID=notebook-with-dashes_and_underscores.123 RUNT_API_KEY=your-key deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.7.3"'
    );
  });

  it("should generate consistent commands for the same inputs", () => {
    const notebookId = "consistent-test";

    const command1 = generateRuntimeCommand(notebookId);
    const command2 = generateRuntimeCommand(notebookId);

    expect(command1).toBe(command2);
    expect(command1).toContain("NOTEBOOK_ID=consistent-test");
  });

  it("should properly format command with NOTEBOOK_ID prefix", () => {
    const customCommand = "my-runtime --flag=value";
    const notebookId = "format-test";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toMatch(
      /^NOTEBOOK_ID=[\w-]+ RUNT_API_KEY=your-key /
    );
    expect(runtimeCommand).toContain("my-runtime --flag=value");
  });
});
