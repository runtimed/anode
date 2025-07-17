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
      'NOTEBOOK_ID=test-notebook-123 deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.6.4"'
    );
  });

  it("should use environment variable through getRuntimeCommand", () => {
    const notebookId = "env-test-notebook";
    const runtimeCommand = getRuntimeCommand(notebookId);

    // Should contain the notebook ID somewhere in the command
    expect(runtimeCommand).toContain(`NOTEBOOK_ID=${notebookId}`);
    // Should contain some runtime command (either custom from env or default)
    expect(runtimeCommand.length).toBeGreaterThan(
      `NOTEBOOK_ID=${notebookId}`.length
    );
  });

  it("should use custom runtime command when provided", () => {
    const customCommand = "python -m my_custom_runtime";
    const notebookId = "test-notebook-456";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toBe(
      "NOTEBOOK_ID=test-notebook-456 python -m my_custom_runtime"
    );
  });

  it("should handle development environment runtime command", () => {
    const devCommand = "pnpm dev:runtime";
    const notebookId = "dev-notebook-789";
    const runtimeCommand = generateRuntimeCommand(notebookId, devCommand);

    expect(runtimeCommand).toBe(
      "NOTEBOOK_ID=dev-notebook-789 pnpm dev:runtime"
    );
  });

  it("should handle notebook IDs with special characters", () => {
    const notebookId = "notebook-with-dashes_and_underscores.123";
    const runtimeCommand = generateRuntimeCommand(notebookId);

    expect(runtimeCommand).toBe(
      'NOTEBOOK_ID=notebook-with-dashes_and_underscores.123 deno run --allow-all --env-file=.env "jsr:@runt/pyodide-runtime-agent@^0.6.4"'
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

    expect(runtimeCommand).toMatch(/^NOTEBOOK_ID=[\w-]+ /);
    expect(runtimeCommand).toContain("my-runtime --flag=value");
  });

  it("should place NOTEBOOK_ID after cd command when command starts with cd", () => {
    const customCommand =
      "cd ../runt && GROQ_API_KEY=test deno run --allow-all mod.ts";
    const notebookId = "cd-test-notebook";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toBe(
      "cd ../runt && NOTEBOOK_ID=cd-test-notebook GROQ_API_KEY=test deno run --allow-all mod.ts"
    );
  });

  it("should handle cd commands with various whitespace", () => {
    const customCommand = "cd   ../project    &&    some command";
    const notebookId = "whitespace-test";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toBe(
      "cd   ../project    &&    NOTEBOOK_ID=whitespace-test some command"
    );
  });

  it("should handle cd command without && operator normally", () => {
    const customCommand = "cd ../project";
    const notebookId = "cd-only-test";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    // Should fall back to default behavior since there's no &&
    expect(runtimeCommand).toBe("NOTEBOOK_ID=cd-only-test cd ../project");
  });

  it("should handle complex cd command with environment variables", () => {
    const customCommand =
      "cd ../runt && GROQ_API_KEY=gsk_123 OTHER_VAR=value deno run --allow-all --env-file=.env packages/pyodide-runtime-agent/src/mod.ts";
    const notebookId = "complex-cd-test";
    const runtimeCommand = generateRuntimeCommand(notebookId, customCommand);

    expect(runtimeCommand).toBe(
      "cd ../runt && NOTEBOOK_ID=complex-cd-test GROQ_API_KEY=gsk_123 OTHER_VAR=value deno run --allow-all --env-file=.env packages/pyodide-runtime-agent/src/mod.ts"
    );
  });
});
