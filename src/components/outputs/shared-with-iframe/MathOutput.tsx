import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathOutputProps {
  content: string;
  displayMode?: boolean;
  className?: string;
}

export function MathOutput({ content, className = "" }: MathOutputProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = React.useState<string>("");

  React.useEffect(() => {
    try {
      // NOTE: this is a hack, we get this format when querying LiveStore.
      // We either fix it more upstream or clean it up here.
      const cleanedContent = cleanContent(content);

      const html = katex.renderToString(cleanedContent, {
        displayMode: true,
        throwOnError: false,
        errorColor: "#cc0000",
        strict: false,
        trust: false,
      });
      setRenderedHtml(html);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setRenderedHtml("");
    }
  }, [content]);

  if (error) {
    return (
      <div className={`math-error ${className}`}>
        <div className="mb-2 text-sm text-red-500">Math rendering error:</div>
        <div className="rounded border bg-red-50 p-2 font-mono text-xs text-red-400">
          {error}
        </div>
        <div className="mt-2 text-xs text-gray-600">Original LaTeX:</div>
        <div className="rounded border bg-gray-50 p-2 font-mono text-sm text-gray-800">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`math-output ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

// Removing the $ and \displaystyle from the beginning and end of the content
function cleanContent(text: string): string {
  return text.replace(/^\$\\displaystyle/, "").replace(/\$$/, "");
}

export default MathOutput;
