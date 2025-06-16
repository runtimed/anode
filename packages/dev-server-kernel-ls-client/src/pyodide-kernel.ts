import { loadPyodide, PyodideInterface } from "pyodide";
import { OutputType, ErrorOutputData, RichOutputData, StreamOutputData } from "../../../shared/schema.js";

export interface OutputData {
  type: OutputType;
  data: RichOutputData | ErrorOutputData | StreamOutputData | unknown;
  metadata?: Record<string, unknown>;
  position: number;
}

export class PyodideKernel {
  private pyodide: PyodideInterface | null = null;
  private readonly notebookId: string;
  private initialized = false;
  private outputs: OutputData[] = [];
  private outputPosition = 0;

  constructor(notebookId: string) {
    this.notebookId = notebookId;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(
      `🐍 Initializing Pyodide kernel for notebook ${this.notebookId}`,
    );

    this.pyodide = await loadPyodide({
      // We'll handle stdout/stderr through IPython's display system
      stdout: () => {},
      stderr: () => {},
    });

    // Install IPython and common packages
    await this.pyodide!.loadPackage(["ipython", "matplotlib", "numpy", "pandas"]);

    // Set up the IPython environment with custom display hooks
    await this.pyodide!.runPythonAsync(`
import sys
import io
import json
import builtins
from IPython.core.interactiveshell import InteractiveShell
from IPython.core.displayhook import DisplayHook
from IPython.core.displaypub import DisplayPublisher
from IPython.core.history import HistoryManager
import matplotlib
import matplotlib.pyplot as plt

# Configure matplotlib for SVG output
matplotlib.use('svg')

# Anode display utilities - inline for now
import base64
from typing import Any, Dict, Optional, Union
from IPython.display import display, HTML, Markdown, JSON, SVG
from IPython.core.display import DisplayObject

class AnodeHTML(HTML):
    """Enhanced HTML display with Anode-specific styling support"""
    def __init__(self, data=None, url=None, filename=None, metadata=None, **kwargs):
        super().__init__(data, url, filename, metadata)
        self.anode_metadata = kwargs

class DataTable(DisplayObject):
    """Display tabular data with rich formatting"""
    def __init__(self, data, headers=None, caption=None, max_rows=100, **kwargs):
        self.data = data
        self.headers = headers
        self.caption = caption
        self.max_rows = max_rows
        self.kwargs = kwargs

    def _repr_html_(self):
        if hasattr(self.data, "to_html"):
            return self.data.to_html(max_rows=self.max_rows, classes="anode-table")

        if not self.data:
            return "<p>No data to display</p>"

        html = ['<table class="anode-table">']

        if self.caption:
            html.append(f"<caption>{self.caption}</caption>")

        if self.headers:
            html.append("<thead><tr>")
            for header in self.headers:
                html.append(f"<th>{header}</th>")
            html.append("</tr></thead>")
        elif isinstance(self.data[0], dict):
            html.append("<thead><tr>")
            for key in self.data[0].keys():
                html.append(f"<th>{key}</th>")
            html.append("</tr></thead>")

        html.append("<tbody>")
        for i, row in enumerate(self.data[:self.max_rows]):
            html.append("<tr>")
            if isinstance(row, dict):
                for value in row.values():
                    html.append(f"<td>{value}</td>")
            else:
                for value in row:
                    html.append(f"<td>{value}</td>")
            html.append("</tr>")
        html.append("</tbody>")

        html.append("</table>")
        return "".join(html)

class Alert(DisplayObject):
    """Display styled alert messages"""
    def __init__(self, message, alert_type="info", title=None):
        self.message = message
        self.alert_type = alert_type
        self.title = title

    def _repr_html_(self):
        classes = f"anode-alert alert-{self.alert_type}"
        html = [f'<div class="{classes}">']

        if self.title:
            html.append(f'<h4 class="alert-title">{self.title}</h4>')

        html.append(f'<div class="alert-message">{self.message}</div>')
        html.append("</div>")
        return "".join(html)

# Convenience functions
def info(message, title="Info"):
    display(Alert(message, "info", title))

def success(message, title="Success"):
    display(Alert(message, "success", title))

def warning(message, title="Warning"):
    display(Alert(message, "warning", title))

def error(message, title="Error"):
    display(Alert(message, "error", title))

def show_table(data, **kwargs):
    display(DataTable(data, **kwargs))

# Make utilities available globally
builtins.anode_info = info
builtins.anode_success = success
builtins.anode_warning = warning
builtins.anode_error = error
builtins.show_table = show_table

# Custom History Manager (no-op for lite environment)
class LiteHistoryManager(HistoryManager):
    def __init__(self, shell=None, config=None, **traits):
        self.enabled = False
        super().__init__(shell=shell, config=config, **traits)

# Custom Stream for capturing stdout/stderr
class LiteStream:
    def __init__(self, name):
        self.name = name
        self.encoding = "utf-8"
        self.publish_stream_callback = None

    def write(self, text):
        if self.publish_stream_callback and text.strip():
            self.publish_stream_callback(self.name, text)

    def flush(self):
        pass

    def isatty(self):
        return False

# Custom Display Publisher for handling display() calls
class LiteDisplayPublisher(DisplayPublisher):
    def __init__(self, shell=None, *args, **kwargs):
        super().__init__(shell, *args, **kwargs)
        self.clear_output_callback = None
        self.update_display_data_callback = None
        self.display_data_callback = None

    def publish(self, data, metadata=None, source=None, *, transient=None, update=False, **kwargs):
        if update and self.update_display_data_callback:
            self.update_display_data_callback(data, metadata, transient)
        elif self.display_data_callback:
            self.display_data_callback(data, metadata, transient)

    def clear_output(self, wait=False):
        if self.clear_output_callback:
            self.clear_output_callback(wait)

# Custom Display Hook for execution results
class LiteDisplayHook(DisplayHook):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.publish_execution_result = None

    def start_displayhook(self):
        self.data = {}
        self.metadata = {}

    def write_output_prompt(self):
        pass

    def write_format_data(self, format_dict, md_dict=None):
        self.data = self._clean_json(format_dict)
        self.metadata = md_dict or {}

    def finish_displayhook(self):
        sys.stdout.flush()
        sys.stderr.flush()

        if self.publish_execution_result and self.data:
            self.publish_execution_result(self.prompt_count, self.data, self.metadata)

        self.data = {}
        self.metadata = {}

    def _clean_json(self, obj):
        """Clean object for JSON serialization"""
        if obj is None:
            return obj
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, dict):
            return {str(k): self._clean_json(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self._clean_json(item) for item in obj]
        return str(obj)

# Custom Interactive Shell
class LiteInteractiveShell(InteractiveShell):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._last_traceback = None

    def init_history(self):
        self.history_manager = LiteHistoryManager(shell=self, parent=self)
        self.configurables.append(self.history_manager)

    def enable_gui(self, gui=None):
        pass

    def _showtraceback(self, etype, evalue, stb):
        self._last_traceback = {
            "ename": str(etype.__name__) if hasattr(etype, '__name__') else str(etype),
            "evalue": str(evalue),
            "traceback": stb,
        }

# Create the shell instance with custom display classes
shell = LiteInteractiveShell.instance(
    displayhook_class=LiteDisplayHook,
    display_pub_class=LiteDisplayPublisher,
)

# Set up streams
stdout_stream = LiteStream("stdout")
stderr_stream = LiteStream("stderr")

# Replace sys.stdout and sys.stderr
sys.stdout = stdout_stream
sys.stderr = stderr_stream

# Custom matplotlib show function
_original_show = plt.show

def _capture_matplotlib_show(block=None):
    """Capture matplotlib plots as SVG and send via display system"""
    if plt.get_fignums():
        fig = plt.gcf()
        svg_buffer = io.StringIO()

        try:
            fig.savefig(svg_buffer, format='svg', bbox_inches='tight',
                       facecolor='white', edgecolor='none')
            svg_content = svg_buffer.getvalue()
            svg_buffer.close()

            # Use IPython's display system
            from IPython.display import display, SVG
            display(SVG(svg_content))

            plt.clf()
        except Exception as e:
            print(f"Error capturing plot: {e}")

    return _original_show(block=block) if block is not None else _original_show()

plt.show = _capture_matplotlib_show

print("🐍 IPython environment ready with rich display support")
`);

    this.initialized = true;
    console.log(`✅ Pyodide kernel ready for notebook ${this.notebookId}`);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async execute(code: string): Promise<OutputData[]> {
    if (!this.initialized) await this.initialize();
    if (!code.trim()) return [];

    // Reset output collection
    this.outputs = [];
    this.outputPosition = 0;

    try {
      // Set up callbacks for display system
      await this.pyodide!.runPythonAsync(`
# Clear any previous execution state
shell._last_traceback = None

# Set up callbacks for this execution
def publish_stream(name, text):
    from js import publish_stream_callback
    publish_stream_callback(name, text)

def publish_display_data(data, metadata, transient):
    from js import publish_display_data_callback
    publish_display_data_callback(data, metadata, transient or {})

def publish_execution_result(execution_count, data, metadata):
    from js import publish_execution_result_callback
    publish_execution_result_callback(execution_count, data, metadata)

def clear_output(wait):
    from js import clear_output_callback
    clear_output_callback(wait)

# Wire up the callbacks
stdout_stream.publish_stream_callback = publish_stream
stderr_stream.publish_stream_callback = publish_stream
shell.display_pub.display_data_callback = publish_display_data
shell.display_pub.clear_output_callback = clear_output
shell.displayhook.publish_execution_result = publish_execution_result
`);

      // Set up JavaScript callbacks that will be called from Python
      (this.pyodide!.globals as any).set("publish_stream_callback",
        (name: string, text: string) => this.handleStream(name, text));

      (this.pyodide!.globals as any).set("publish_display_data_callback",
        (data: any, metadata: any, transient: any) => this.handleDisplayData(data, metadata, transient));

      (this.pyodide!.globals as any).set("publish_execution_result_callback",
        (execution_count: number, data: any, metadata: any) => this.handleExecutionResult(execution_count, data, metadata));

      (this.pyodide!.globals as any).set("clear_output_callback",
        (wait: boolean) => this.handleClearOutput(wait));

      // Execute the code through IPython
      const result = await this.pyodide!.runPythonAsync(`
try:
    result = shell.run_cell("""${code.replace(/"""/g, '\\"""')}""", store_history=True)

    # Check for execution errors
    if shell._last_traceback:
        traceback_info = shell._last_traceback
        shell._last_traceback = None
        {"status": "error", "traceback": traceback_info}
    else:
        {"status": "ok", "result": result}
except Exception as e:
    import traceback
    {"status": "error", "traceback": {
        "ename": type(e).__name__,
        "evalue": str(e),
        "traceback": traceback.format_exc().split("\\n")
    }}
`);

      const executionResult = result as any;

      if (executionResult.status === "error") {
        const traceback = executionResult.traceback;
        const errorData: ErrorOutputData = {
          ename: traceback.ename || "PythonError",
          evalue: traceback.evalue || "Execution failed",
          traceback: Array.isArray(traceback.traceback) ? traceback.traceback : [traceback.traceback || ""],
        };

        this.outputs.push({
          type: "error",
          data: errorData,
          position: this.outputPosition++,
        });
      }

    } catch (err: unknown) {
      const errorData: ErrorOutputData = {
        ename: (err as Error)?.name ?? "KernelError",
        evalue: (err as Error)?.message ?? "Kernel execution failed",
        traceback: [(err as Error)?.stack ?? ""],
      };

      this.outputs.push({
        type: "error",
        data: errorData,
        position: this.outputPosition++,
      });
    }

    return this.outputs;
  }

  private handleStream(name: string, text: string): void {
    this.outputs.push({
      type: "stream",
      data: {
        name: name as "stdout" | "stderr",
        text: text,
      } as StreamOutputData,
      metadata: {},
      position: this.outputPosition++,
    });
  }

  private handleDisplayData(data: any, metadata: any, transient: any): void {
    this.outputs.push({
      type: "display_data",
      data: this.formatDisplayData(data),
      metadata: metadata || {},
      position: this.outputPosition++,
    });
  }

  private handleExecutionResult(execution_count: number, data: any, metadata: any): void {
    if (data && Object.keys(data).length > 0) {
      this.outputs.push({
        type: "execute_result",
        data: this.formatDisplayData(data),
        metadata: metadata || {},
        position: this.outputPosition++,
      });
    }
  }

  private handleClearOutput(wait: boolean): void {
    // For now, we'll just log this - in a full implementation,
    // this would clear previous outputs in the UI
    console.log(`Clear output requested (wait: ${wait})`);
  }

  private formatDisplayData(data: any): RichOutputData {
    if (!data || typeof data !== 'object') {
      return { "text/plain": String(data || '') };
    }

    const formatted: RichOutputData = {};

    // Handle common MIME types
    const mimeTypes = [
      'text/plain',
      'text/html',
      'text/markdown',
      'application/json',
      'image/png',
      'image/jpeg',
      'image/svg+xml',
      'application/pdf'
    ];

    for (const mimeType of mimeTypes) {
      if (data[mimeType] !== undefined) {
        formatted[mimeType] = data[mimeType];
      }
    }

    // Ensure we always have text/plain
    if (!formatted['text/plain'] && Object.keys(formatted).length === 0) {
      formatted['text/plain'] = String(data);
    }

    return formatted;
  }

  async terminate(): Promise<void> {
    if (this.pyodide) {
      // Clean up IPython shell
      await this.pyodide.runPythonAsync(`
try:
    shell.reset()
except:
    pass
`);
    }

    this.pyodide = null;
    this.initialized = false;
  }
}
