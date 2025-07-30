import React from "react";

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const OutputsErrorBoundary: React.FC<FallbackProps> = () => {
  return <span className="text-sm text-red-600">Error rendering outputs</span>;
};
