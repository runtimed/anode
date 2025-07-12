import { getCurrentAuthToken } from "../auth/google-auth.js";

export interface ArtifactFetchOptions {
  /**
   * Custom auth token to use instead of the current one
   */
  authToken?: string;
  /**
   * Base URL for the sync server (defaults to current origin)
   */
  syncUrl?: string;
  /**
   * AbortSignal for cancelling the request
   */
  signal?: AbortSignal;
}

/**
 * Fetch artifact content from the sync backend
 *
 * @param artifactId - The artifact identifier (e.g., "notebook123/abc456")
 * @param options - Fetch options
 * @returns Promise resolving to the artifact content as a Blob
 */
export async function fetchArtifact(
  artifactId: string,
  options: ArtifactFetchOptions = {}
): Promise<Blob> {
  const {
    authToken = getCurrentAuthToken(),
    syncUrl = window.location.origin,
    signal,
  } = options;

  const url = new URL(`/api/artifacts/${artifactId}`, syncUrl);
  url.searchParams.set("token", authToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Failed to fetch artifact: ${response.status}`;
    } catch {
      errorMessage = `Failed to fetch artifact: ${response.status} ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return await response.blob();
}

/**
 * Generate a URL for accessing artifact content
 *
 * @param artifactId - The artifact identifier
 * @param options - URL generation options
 * @returns URL string for accessing the artifact
 */
export function getArtifactUrl(
  artifactId: string,
  options: Pick<ArtifactFetchOptions, "authToken" | "syncUrl"> = {}
): string {
  const {
    authToken = getCurrentAuthToken(),
    syncUrl = window.location.origin,
  } = options;

  const url = new URL(`/api/artifacts/${artifactId}`, syncUrl);
  url.searchParams.set("token", authToken);
  return url.toString();
}

/**
 * Convert a Blob to a data URL for inline display
 *
 * @param blob - The blob to convert
 * @returns Promise resolving to a data URL string
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a Blob to text content
 *
 * @param blob - The blob to convert
 * @returns Promise resolving to text content
 */
export async function blobToText(blob: Blob): Promise<string> {
  return await blob.text();
}

/**
 * Cache for artifact content to avoid redundant fetches
 */
const artifactCache = new Map<string, Promise<Blob>>();

/**
 * Fetch artifact with caching to avoid duplicate requests
 *
 * @param artifactId - The artifact identifier
 * @param options - Fetch options
 * @returns Promise resolving to the artifact content as a Blob
 */
export async function fetchArtifactCached(
  artifactId: string,
  options: ArtifactFetchOptions = {}
): Promise<Blob> {
  const cacheKey = `${artifactId}-${options.authToken || getCurrentAuthToken()}`;

  if (artifactCache.has(cacheKey)) {
    return artifactCache.get(cacheKey)!;
  }

  const fetchPromise = fetchArtifact(artifactId, options);
  artifactCache.set(cacheKey, fetchPromise);

  try {
    return await fetchPromise;
  } catch (error) {
    // Remove failed requests from cache
    artifactCache.delete(cacheKey);
    throw error;
  }
}

/**
 * Clear the artifact cache (useful when auth token changes)
 */
export function clearArtifactCache(): void {
  artifactCache.clear();
}

/**
 * Upload an artifact to the sync backend
 *
 * @param file - File or Blob to upload
 * @param notebookId - The notebook ID to associate with the artifact
 * @param options - Upload options
 * @returns Promise resolving to upload response
 */
export async function uploadArtifact(
  file: File | Blob,
  notebookId: string,
  options: ArtifactFetchOptions = {}
): Promise<{
  artifactId: string;
  byteLength: number;
  mimeType: string;
}> {
  const {
    authToken = getCurrentAuthToken(),
    syncUrl = window.location.origin,
    signal,
  } = options;

  const url = new URL("/api/artifacts", syncUrl);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("notebookId", notebookId);
  formData.append("authToken", authToken);

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || `Upload failed: ${response.status}`;
    } catch {
      errorMessage = `Upload failed: ${response.status} ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}
