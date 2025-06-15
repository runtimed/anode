import { loadPyodide } from "pyodide";

export interface OutputData {
  type: "display_data" | "execute_result" | "stream" | "error";
  data: any;
  metadata?: any;
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

    // Install common packages for data science and visualization
    await this.pyodide.loadPackage(["matplotlib", "numpy", "pandas"]);

    // Set up matplotlib for rich output
    this.pyodide.runPython(`
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io
import base64

# Configure matplotlib for SVG output
matplotlib.use('svg')

# Helper function to create rich outputs
def _display_result(result):
    """Convert result to rich output format"""
    if hasattr(result, '_repr_html_'):
        return {'text/html': result._repr_html_()}
    elif hasattr(result, '_repr_markdown_'):
        return {'text/markdown': result._repr_markdown_()}
    elif hasattr(result, '_repr_svg_'):
        return {'image/svg+xml': result._repr_svg_()}
    else:
        return {'text/plain': str(result)}

# Override plt.show to capture plots
_original_show = plt.show
def _custom_show(block=None):
    """Custom show function that captures SVG output"""
    if plt.get_fignums():  # Check if there are active figures
        # Get current figure
        fig = plt.gcf()

        # Save as SVG
        svg_buffer = io.StringIO()
        fig.savefig(svg_buffer, format='svg', bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        svg_content = svg_buffer.getvalue()
        svg_buffer.close()

        # Store the SVG for retrieval
        globals()['_last_plot_svg'] = svg_content

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
      // Clear any previous plot SVG
      this.pyodide.runPython("globals().pop('_last_plot_svg', None)");

      // Execute the code
      const result = await this.pyodide.runPythonAsync(code);

      // Check if there's a plot SVG to display
      const plotSvg = this.pyodide.runPython("globals().get('_last_plot_svg', None)");
      if (plotSvg && plotSvg !== "None") {
        outputs.push({
          type: "display_data",
          data: {
            "image/svg+xml": plotSvg,
            "text/plain": "[Plot output]"
          },
          metadata: { "plotly": { "display_as": "svg" } },
          position: outputs.length,
        });
      }

      // Handle the execution result
      if (result !== undefined && result !== null) {
        // Try to get rich representation
        const richData = this.pyodide.runPython(`
try:
    _display_result(${JSON.stringify(result)})
except:
    {"text/plain": str(${JSON.stringify(result)})}
`);

        outputs.push({
          type: "execute_result",
          data: richData || { "text/plain": String(result) },
          position: outputs.length,
        });
      }

      // Handle special cases for common data types
      if (typeof result === 'object' && result !== null) {
        // Check if it's a pandas DataFrame
        const isDataFrame = this.pyodide.runPython(`
try:
    import pandas as pd
    isinstance(${JSON.stringify(result)}, pd.DataFrame)
except:
    False
`);

        if (isDataFrame) {
          const htmlRepr = this.pyodide.runPython(`${JSON.stringify(result)}._repr_html_()`);
          if (htmlRepr) {
            outputs[outputs.length - 1].data["text/html"] = htmlRepr;
          }
        }
      }

    } catch (err: any) {
      outputs.push({
        type: "error",
        data: {
          ename: err?.name ?? "PythonError",
          evalue: err?.message ?? "Execution failed",
          traceback: [err?.stack ?? ""],
        },
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
