import { useState, useEffect, useCallback } from "react";
import { fetchArtifactCached, blobToDataUrl, blobToText } from "../util/artifacts.js";

export interface UseArtifactOptions {
  /**
   * Custom auth token to use instead of the current one
   */
  authToken?: string;
  /**
   * Base URL for the sync server (defaults to current origin)
   */
  syncUrl?: string;
  /**
   * Whether to convert the artifact to a data URL for inline display
   * Useful for images, videos, etc.
   */
  asDataUrl?: boolean;
  /**
   * Whether to convert the artifact to text content
   * Useful for text-based content like HTML, JSON, etc.
   */
  asText?: boolean;
  /**
   * Whether to automatically fetch the artifact when the hook mounts
   * Defaults to true
   */
  autoFetch?: boolean;
}

export interface UseArtifactResult {
  /**
   * The raw blob content (if not converted)
   */
  blob: Blob | null;
  /**
   * The data URL (if asDataUrl is true)
   */
  dataUrl: string | null;
  /**
   * The text content (if asText is true)
   */
  text: string | null;
  /**
   * Loading state
   */
  loading: boolean;
  /**
   * Error state
   */
  error: Error | null;
  /**
   * Manually trigger a fetch/refetch
   */
  refetch: () => Promise<void>;
  /**
   * Clear the current data and error state
   */
  clear: () => void;
}

/**
 * React hook for fetching and using artifact content
 *
 * @param artifactId - The artifact identifier to fetch
 * @param options - Configuration options
 * @returns Artifact data and state management
 *
 * @example
 * ```tsx
 * // For images
 * const { dataUrl, loading, error } = useArtifact("notebook123/image-hash", {
 *   asDataUrl: true
 * });
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (dataUrl) return <img src={dataUrl} alt="Artifact" />;
 * ```
 *
 * @example
 * ```tsx
 * // For text content
 * const { text, loading, error } = useArtifact("notebook123/html-hash", {
 *   asText: true
 * });
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (text) return <div dangerouslySetInnerHTML={{ __html: text }} />;
 * ```
 */
export function useArtifact(
  artifactId: string | null,
  options: UseArtifactOptions = {}
): UseArtifactResult {
  const {
    authToken,
    syncUrl,
    asDataUrl = false,
    asText = false,
    autoFetch = true,
  } = options;

  const [blob, setBlob] = useState<Blob | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clear = useCallback(() => {
    setBlob(null);
    setDataUrl(null);
    setText(null);
    setError(null);
    setLoading(false);
  }, []);

  const refetch = useCallback(async () => {
    if (!artifactId) {
      clear();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedBlob = await fetchArtifactCached(artifactId, {
        authToken,
        syncUrl,
      });

      setBlob(fetchedBlob);

      // Convert to data URL if requested
      if (asDataUrl) {
        const url = await blobToDataUrl(fetchedBlob);
        setDataUrl(url);
      } else {
        setDataUrl(null);
      }

      // Convert to text if requested
      if (asText) {
        const textContent = await blobToText(fetchedBlob);
        setText(textContent);
      } else {
        setText(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setBlob(null);
      setDataUrl(null);
      setText(null);
    } finally {
      setLoading(false);
    }
  }, [artifactId, authToken, syncUrl, asDataUrl, asText, clear]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && artifactId) {
      refetch();
    } else if (!artifactId) {
      clear();
    }
  }, [autoFetch, artifactId, refetch, clear]);

  return {
    blob,
    dataUrl,
    text,
    loading,
    error,
    refetch,
    clear,
  };
}

/**
 * Simplified hook for fetching artifact as a data URL (useful for images)
 */
export function useArtifactDataUrl(
  artifactId: string | null,
  options: Omit<UseArtifactOptions, "asDataUrl"> = {}
): Pick<UseArtifactResult, "dataUrl" | "loading" | "error" | "refetch"> {
  const result = useArtifact(artifactId, { ...options, asDataUrl: true });
  return {
    dataUrl: result.dataUrl,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

/**
 * Simplified hook for fetching artifact as text (useful for HTML, JSON, etc.)
 */
export function useArtifactText(
  artifactId: string | null,
  options: Omit<UseArtifactOptions, "asText"> = {}
): Pick<UseArtifactResult, "text" | "loading" | "error" | "refetch"> {
  const result = useArtifact(artifactId, { ...options, asText: true });
  return {
    text: result.text,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
