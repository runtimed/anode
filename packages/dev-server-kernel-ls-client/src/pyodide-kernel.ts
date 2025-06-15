import { loadPyodide, PyodideInterface } from "pyodide";
import { OutputType, GenericOutputData, ErrorOutputData, RichOutputData } from "@anode/schema";

export interface OutputData {
  type: OutputType;
  data: RichOutputData | ErrorOutputData | unknown;
  metadata?: Record<string, unknown>;
  position: number;
}

export class PyodideKernel {
  private pyodide: PyodideInterface | null = null;
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

    // Install common packages for data science and visualization
    await this.pyodide!.loadPackage(["matplotlib", "numpy", "pandas"]);

    // Set up matplotlib and simple display formatting
    this.pyodide!.runPython(`
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io
import json

# Configure matplotlib for SVG output
matplotlib.use('svg')

def format_for_display(obj):
    """Simple formatter for common data types"""
    if obj is None:
        return None

    result = {"text/plain": str(obj)}

    # Check for pandas DataFrame
    if hasattr(obj, '_repr_html_') and hasattr(obj, 'columns'):
        try:
            result["text/html"] = obj._repr_html_()
        except:
            pass

    # Check for other rich representations
    if hasattr(obj, '_repr_markdown_'):
        try:
            result["text/markdown"] = obj._repr_markdown_()
        except:
            pass

    if hasattr(obj, '_repr_svg_'):
        try:
            result["image/svg+xml"] = obj._repr_svg_()
        except:
            pass

    return result

# Store for plot outputs
_plot_outputs = []

# Override plt.show to capture plots
_original_show = plt.show
def _custom_show(block=None):
    """Custom show function that captures SVG output"""
    global _plot_outputs

    if plt.get_fignums():  # Check if there are active figures
        # Get current figure
        fig = plt.gcf()

        # Save as SVG
        svg_buffer = io.StringIO()
        fig.savefig(svg_buffer, format='svg', bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        svg_content = svg_buffer.getvalue()
        svg_buffer.close()

        # Store the plot
        _plot_outputs.append({
            'data': {
                'image/svg+xml': svg_content,
                'text/plain': '[Plot output]'
            },
            'metadata': {},
            'output_type': 'display_data'
        })

        # Clear the figure
        plt.clf()

    return _original_show(block=block) if block is not None else _original_show()

plt.show = _custom_show

print("🐍 Python runtime ready with matplotlib and rich output support")
`);

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
      // Clear any previous plot outputs
      this.pyodide!.runPython("_plot_outputs = []");

      // Execute the code and capture the result
      const result = await this.pyodide!.runPythonAsync(code);

      // Get any plot outputs that were generated
      const plotOutputsJson = this.pyodide!.runPython(`
import json
json.dumps(_plot_outputs)
`);

      // Add plot outputs first
      if (plotOutputsJson && plotOutputsJson !== "[]") {
        const plotOutputs = JSON.parse(plotOutputsJson as string);
        plotOutputs.forEach((output: { output_type: string; data: unknown; metadata?: Record<string, unknown> }, idx: number) => {
          outputs.push({
            type: output.output_type as OutputType,
            data: output.data,
            metadata: output.metadata || {},
            position: idx,
          });
        });
      }

      // Handle the execution result if we have one
      if (result !== undefined && result !== null) {
        // Get rich representation of the result
        this.pyodide!.globals.set("_temp_result", result);
        const richDataJson = this.pyodide!.runPython(`
import json
result_data = format_for_display(_temp_result)
json.dumps(result_data)
`);

        if (richDataJson && richDataJson !== "null") {
          const richData = JSON.parse(richDataJson as string);
          outputs.push({
            type: "execute_result",
            data: richData,
            metadata: {},
            position: outputs.length,
          });
        }
      }

    } catch (err: unknown) {
      const errorData: ErrorOutputData = {
        ename: (err as Error)?.name ?? "PythonError",
        evalue: (err as Error)?.message ?? "Execution failed",
        traceback: [(err as Error)?.stack ?? ""],
      };

      outputs.push({
        type: "error",
        data: errorData,
        position: outputs.length,
      });
    }
    return outputs;
  }

  async terminate() {
    this.pyodide = null;
    this.initialized = false;
  }
}
