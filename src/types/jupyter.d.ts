/**
 * Jupyter Notebook (.ipynb) format interface
 */
export interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: {
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
    anode?: {
      exported_at: string;
      version: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}

export interface JupyterCell {
  cell_type: "code" | "markdown" | "raw";
  metadata: Record<string, any>;
  source: string | string[];
  execution_count?: number | null;
  outputs?: JupyterOutput[];
}

export interface JupyterOutput {
  output_type: "execute_result" | "display_data" | "stream" | "error";
  execution_count?: number | null;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  name?: string;
  text?: string | string[];
  ename?: string;
  evalue?: string;
  traceback?: string[];
}
