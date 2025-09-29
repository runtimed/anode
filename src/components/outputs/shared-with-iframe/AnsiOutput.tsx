import React from "react";
import Ansi from "ansi-to-react";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";

interface AnsiOutputProps {
  children: string;
  className?: string;
  isError?: boolean;
}

/**
 * AnsiOutput component for rendering ANSI escape sequences as colored text
 *
 * This component preserves the beautiful colored output that developers expect
 * while using ansi-to-react to convert ANSI codes to styled React elements.
 *
 * For AI context, use cleanForAI() utility to strip ANSI codes.
 * For user display, use this component to render the colors.
 */
export const AnsiOutput: React.FC<AnsiOutputProps> = ({
  children,
  className = "",
  isError = false,
}) => {
  if (!children || typeof children !== "string") {
    return null;
  }

  const baseClasses = `font-mono text-sm whitespace-pre-wrap leading-relaxed ${className}`;
  const errorClasses = isError ? "text-red-600" : "";
  const finalClasses = `${baseClasses} ${errorClasses}`.trim();

  return (
    <div className={finalClasses}>
      <Ansi useClasses={false}>{children}</Ansi>
    </div>
  );
};

/**
 * AnsiStreamOutput component specifically for stdout/stderr rendering
 */
export const AnsiStreamOutput: React.FC<{
  text: string;
  streamName: "stdout" | "stderr";
  className?: string;
}> = ({ text, streamName, className = "" }) => {
  const isStderr = streamName === "stderr";
  const streamClasses = isStderr ? "text-red-600" : "text-gray-700";

  return (
    <div className={`py-2 ${streamClasses} ${className}`}>
      <AnsiOutput isError={isStderr}>{text}</AnsiOutput>
    </div>
  );
};

/**
 * AnsiErrorOutput component specifically for error messages and tracebacks
 */
export const AnsiErrorOutput: React.FC<{
  ename?: string;
  evalue?: string;
  traceback?: string[] | string;
  className?: string;
}> = ({ ename, evalue, traceback, className = "" }) => {
  return (
    <div className={`border-l-2 border-red-200 py-3 pl-1 ${className}`}>
      {ename && evalue && (
        <div className="mb-1 font-semibold text-red-700">
          <AnsiOutput isError>{`${ename}: ${evalue}`}</AnsiOutput>
        </div>
      )}
      {traceback && (
        <div className="mt-2 text-xs text-red-600 opacity-80">
          <AnsiOutput isError>
            {Array.isArray(traceback) ? traceback.join("\n") : traceback}
          </AnsiOutput>
        </div>
      )}
      <button className="flex appearance-none items-center gap-1 rounded-md border-none bg-red-500 px-2 py-1 text-sm text-white ring-0 transition-colors outline-none hover:bg-red-600 focus:ring-2 focus:ring-red-500/20 active:bg-red-800">
        <Bug className="h-3 w-3" />
        Fix Code
      </button>
    </div>
  );
};
