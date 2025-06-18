import * as path from "path";
import * as os from "os";

/**
 * Get essential packages for Pyodide kernel initialization
 * These are loaded by default to provide a good development experience
 */
export function getEssentialPackages(): string[] {
  return [
    "ipython",
    "matplotlib",
    "numpy",
    "pandas",
    "polars",     // Fast DataFrames
    "duckdb",     // SQL analytics
    "requests",
    "micropip",
    "scipy",      // Scientific computing
    "sympy",      // Symbolic mathematics
    "bokeh",      // Interactive visualization
    "scikit-learn", // Machine learning
    "altair",     // Statistical visualization
    "geopandas",  // Geospatial data analysis
  ];
}

/**
 * Get cache directory path for Pyodide packages
 */
export function getCacheDir(): string {
  return path.join(os.homedir(), '.anode', 'pyodide-cache');
}

/**
 * Get cache configuration for Pyodide loadPyodide() options
 */
export function getCacheConfig(): { packageCacheDir: string } {
  return {
    packageCacheDir: getCacheDir()
  };
}
