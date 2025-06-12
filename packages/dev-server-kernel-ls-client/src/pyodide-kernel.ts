import { loadPyodide } from "pyodide";

export interface OutputData {
  type: "display_data" | "execute_result" | "stream" | "error";
  data: any;
  position: number;
}

export class PyodideKernel {
  private pyodide: any = null;
  private readonly notebookId: string;
  private initialized = false;

  constructor(notebookId: string) {
    this.notebookId = notebookId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(
      `🐍 Initializing Pyodide kernel for notebook ${this.notebookId}`,
    );

    this.pyodide = await loadPyodide({
      stdout: (text: string) => console.log("[py]:", text),
      stderr: (text: string) => console.error("[py]:", text),
    });

    this.pyodide.runPython('print("🐍 Python runtime ready")');

    this.initialized = true;
    console.log(`✅ Pyodide kernel ready for notebook ${this.notebookId}`);
  }

  isInitialized() {
    return this.initialized;
  }

  async execute(code: string): Promise<OutputData[]> {
    if (!this.initialized) await this.initialize();
    if (!code.trim()) return [];

    const outputs: OutputData[] = [];
    try {
      const result = await this.pyodide.runPythonAsync(code);
      if (result !== undefined) {
        outputs.push({
          type: "execute_result",
          data: { "text/plain": String(result) },
          position: 0,
        });
      }
    } catch (err: any) {
      outputs.push({
        type: "error",
        data: {
          ename: err?.name ?? "PythonError",
          evalue: err?.message ?? "Execution failed",
          traceback: [err?.stack ?? ""],
        },
        position: 0,
      });
    }
    return outputs;
  }

  async terminate() {
    this.pyodide = null;
    this.initialized = false;
  }
}
