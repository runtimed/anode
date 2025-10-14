/**
 * Notebook Runtime Type Detection Hook
 *
 * Detects the preferred runtime type for a notebook based on its metadata.
 * Checks for notebook metadata that indicates whether this should use
 * HTML or Python runtime by default.
 */

import { useQuery } from "@livestore/react";
import { queryDb, tables } from "@runtimed/schema";
import type { AutoLaunchRuntimeType } from "./useAutoLaunchRuntime";

export interface NotebookRuntimeTypeResult {
  /** Detected runtime type for this notebook */
  runtimeType: AutoLaunchRuntimeType;
  /** Whether runtime type was explicitly set in metadata */
  isExplicit: boolean;
  /** Raw metadata values for debugging */
  metadata: Record<string, string>;
}

/**
 * Hook to detect the preferred runtime type for the current notebook
 * based on metadata indicators.
 *
 * Checks for:
 * - `runtimeType` metadata key (explicit setting)
 * - `notebookType` metadata key (notebook classification)
 * - `lastUsedRuntimeType` metadata key (previous user choice)
 *
 * @returns Runtime type information with detection reasoning
 */
export function useNotebookRuntimeType(): NotebookRuntimeTypeResult {
  // Query all notebook metadata
  const metadataRecords = useQuery(
    queryDb(tables.notebookMetadata.select("key", "value"))
  );

  // Convert to key-value map for easier access
  const metadata = metadataRecords.reduce(
    (acc, record) => {
      acc[record.key] = record.value;
      return acc;
    },
    {} as Record<string, string>
  );

  // Detection logic
  const detectRuntimeType = (): {
    type: AutoLaunchRuntimeType;
    isExplicit: boolean;
  } => {
    // 1. Check for explicit runtime type setting
    if (metadata.runtimeType) {
      const explicitType = metadata.runtimeType.toLowerCase();
      if (explicitType === "html" || explicitType === "python") {
        return {
          type: explicitType as AutoLaunchRuntimeType,
          isExplicit: true,
        };
      }
    }

    // 2. Check for notebook type classification
    if (metadata.notebookType) {
      const notebookType = metadata.notebookType.toLowerCase();
      if (notebookType === "html" || notebookType === "web") {
        return { type: "html", isExplicit: true };
      }
      if (
        notebookType === "python" ||
        notebookType === "jupyter" ||
        notebookType === "scientific"
      ) {
        return { type: "python", isExplicit: true };
      }
    }

    // 3. Check for last used runtime type (user preference)
    if (metadata.lastUsedRuntimeType) {
      const lastUsed = metadata.lastUsedRuntimeType.toLowerCase();
      if (lastUsed === "html" || lastUsed === "python") {
        return {
          type: lastUsed as AutoLaunchRuntimeType,
          isExplicit: false, // This is a preference, not explicit setting
        };
      }
    }

    // 4. Check for HTML-specific indicators
    const htmlIndicators = [
      "template", // HTML template notebooks
      "website", // Website prototyping
      "frontend", // Frontend development
      "ui", // UI development
      "demo", // HTML demos
    ];

    for (const indicator of htmlIndicators) {
      if (
        metadata.category?.toLowerCase().includes(indicator) ||
        metadata.tags?.toLowerCase().includes(indicator) ||
        metadata.purpose?.toLowerCase().includes(indicator)
      ) {
        return { type: "html", isExplicit: false };
      }
    }

    // 5. Check for Python-specific indicators (though this is the default)
    const pythonIndicators = [
      "analysis", // Data analysis
      "science", // Data science
      "ml", // Machine learning
      "ai", // AI development
      "research", // Research notebooks
      "jupyter", // Jupyter-style notebooks
    ];

    for (const indicator of pythonIndicators) {
      if (
        metadata.category?.toLowerCase().includes(indicator) ||
        metadata.tags?.toLowerCase().includes(indicator) ||
        metadata.purpose?.toLowerCase().includes(indicator)
      ) {
        return { type: "python", isExplicit: false };
      }
    }

    // 6. Default to Python (most common use case)
    return { type: "python", isExplicit: false };
  };

  const { type, isExplicit } = detectRuntimeType();

  return {
    runtimeType: type,
    isExplicit,
    metadata,
  };
}

/**
 * Simple version that just returns the detected runtime type
 */
export function useDetectedRuntimeType(): AutoLaunchRuntimeType {
  const { runtimeType } = useNotebookRuntimeType();
  return runtimeType;
}

/**
 * Hook that combines auto-launch config with notebook detection
 * Uses notebook metadata to override default runtime type if detected
 */
export function useSmartAutoLaunchRuntime() {
  const { runtimeType: detectedType, isExplicit } = useNotebookRuntimeType();

  // Use detected type as the default, but allow user to override
  return {
    detectedRuntimeType: detectedType,
    isExplicitlySet: isExplicit,
    // You can combine this with useAutoLaunchRuntime to provide smart defaults
  };
}
