/**
 * Bootstrap packages - minimal set needed for IPython setup
 * These are loaded via loadPyodide's packages option for maximum efficiency
 */
export function getBootstrapPackages(): string[] {
  return ["micropip", "ipython", "matplotlib"];
}

export function getEssentialPackages(): string[] {
  return [
    "ipython",
    "matplotlib",
    "numpy",
    "pandas",
    "polars",
    "duckdb",
    "pyarrow",
    "requests",
    "micropip",
    "pyodide-http",
    "scipy",
    "sympy",
    "bokeh",
    "scikit-learn",
    "altair",
    "geopandas",
    "rich",
    "networkx",
    "beautifulsoup4",
    "lxml",
    "pillow",
    "statsmodels",
  ];
}
