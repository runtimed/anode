import React from "react";
import { useArtifactText } from "../../hooks/useArtifact.js";
import { TEXT_MIME_TYPES, IMAGE_MIME_TYPES } from "@runt/schema";
import { getCurrentAuthToken } from "../../auth/google-auth.js";

interface ArtifactRendererProps {
  /**
   * The artifact ID to render
   */
  artifactId: string;
  /**
   * MIME type of the artifact content
   */
  mimeType: string;
  /**
   * Additional metadata about the artifact
   */
  metadata?: {
    byteLength?: number;
    [key: string]: unknown;
  };
  /**
   * CSS class name for styling
   */
  className?: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-900"></div>
    <span className="ml-2 text-sm text-gray-600">Loading artifact...</span>
  </div>
);

const ErrorDisplay = ({ error }: { error: Error }) => (
  <div className="rounded border border-red-200 bg-red-50 p-3">
    <div className="text-sm font-medium text-red-800">
      Failed to load artifact
    </div>
    <div className="mt-1 text-xs text-red-600">{error.message}</div>
  </div>
);

/**
 * Component for rendering artifact content based on MIME type
 */
export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({
  artifactId,
  mimeType,
  metadata,
  className = "",
}) => {
  // Determine how to fetch the artifact based on MIME type
  const isImageType = IMAGE_MIME_TYPES.includes(mimeType as any);
  const isTextType =
    TEXT_MIME_TYPES.includes(mimeType as any) ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType.includes("+json") ||
    mimeType.includes("+xml");

  // For images, use direct artifact URL instead of data URL conversion
  // For text content, fetch and convert to text
  const textResult = useArtifactText(
    isTextType && !isImageType ? artifactId : null
  );

  // Only text results have loading/error states for now
  const loading = textResult.loading;
  const error = textResult.error;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // Render based on content type
  if (isImageType) {
    // Use artifact service URL directly for images
    // Get sync URL from environment variable, defaulting to port 8787 for local dev
    const syncUrl =
      import.meta.env.VITE_LIVESTORE_SYNC_URL?.replace("ws://", "http://")
        .replace("wss://", "https://")
        .replace("/livestore", "") || "http://localhost:8787";
    const artifactUrl = `${syncUrl}/api/artifacts/${artifactId}?token=${getCurrentAuthToken()}`;

    return (
      <div className={`artifact-image ${className}`}>
        <img
          src={artifactUrl}
          alt={`Artifact ${artifactId}`}
          className="h-auto max-w-full"
          loading="lazy"
        />
        {metadata?.byteLength && (
          <div className="mt-1 text-xs text-gray-500">
            {formatFileSize(metadata.byteLength)}
          </div>
        )}
      </div>
    );
  }

  if (mimeType === "text/html" && textResult.text) {
    return (
      <div className={`artifact-html ${className}`}>
        <div
          dangerouslySetInnerHTML={{ __html: textResult.text }}
          className="prose max-w-none"
        />
        {metadata?.byteLength && (
          <div className="mt-1 text-xs text-gray-500">
            {formatFileSize(metadata.byteLength)}
          </div>
        )}
      </div>
    );
  }

  if (mimeType === "text/markdown" && textResult.text) {
    return (
      <div className={`artifact-markdown ${className}`}>
        <div className="rounded bg-gray-50 p-3 font-mono text-sm whitespace-pre-wrap">
          {textResult.text}
        </div>
        {metadata?.byteLength && (
          <div className="mt-1 text-xs text-gray-500">
            {formatFileSize(metadata.byteLength)}
          </div>
        )}
      </div>
    );
  }

  if (
    (mimeType === "application/json" || mimeType.includes("+json")) &&
    textResult.text
  ) {
    let jsonData;
    try {
      jsonData = JSON.parse(textResult.text);
    } catch {
      // Fall back to plain text if JSON parsing fails
      jsonData = textResult.text;
    }

    return (
      <div className={`artifact-json ${className}`}>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-sm">
          {typeof jsonData === "string"
            ? jsonData
            : JSON.stringify(jsonData, null, 2)}
        </pre>
        {metadata?.byteLength && (
          <div className="mt-1 text-xs text-gray-500">
            {formatFileSize(metadata.byteLength)}
          </div>
        )}
      </div>
    );
  }

  if (mimeType.startsWith("text/") && textResult.text) {
    return (
      <div className={`artifact-text ${className}`}>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-sm whitespace-pre-wrap">
          {textResult.text}
        </pre>
        {metadata?.byteLength && (
          <div className="mt-1 text-xs text-gray-500">
            {formatFileSize(metadata.byteLength)}
          </div>
        )}
      </div>
    );
  }

  // For unsupported types, show a download link or placeholder
  return (
    <div className={`artifact-unsupported ${className}`}>
      <div className="rounded border border-gray-300 bg-gray-100 p-4 text-center">
        <div className="mb-2 text-sm text-gray-600">
          <span className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">
            {mimeType}
          </span>
        </div>
        <div className="font-medium text-gray-800">
          Artifact content (
          {metadata?.byteLength
            ? formatFileSize(metadata.byteLength)
            : "unknown size"}
          )
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Preview not available for this content type
        </div>
        <div className="mt-2 font-mono text-xs text-gray-400">
          ID: {artifactId}
        </div>
      </div>
    </div>
  );
};

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
