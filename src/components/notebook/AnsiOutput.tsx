import React from "react";

interface AnsiSegment {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// Tailwind color mappings for standard ANSI colors
const ANSI_COLORS: Record<number, string> = {
  // Standard colors
  0: "text-black", // black
  1: "text-red-600", // red
  2: "text-green-600", // green
  3: "text-yellow-600", // yellow
  4: "text-blue-600", // blue
  5: "text-purple-600", // magenta
  6: "text-cyan-600", // cyan
  7: "text-white", // white

  // Bright colors
  8: "text-gray-500", // bright black (gray)
  9: "text-red-400", // bright red
  10: "text-green-400", // bright green
  11: "text-yellow-400", // bright yellow
  12: "text-blue-400", // bright blue
  13: "text-purple-400", // bright magenta
  14: "text-cyan-400", // bright cyan
  15: "text-gray-100", // bright white
};

const ANSI_BG_COLORS: Record<number, string> = {
  // Standard background colors
  40: "bg-black",
  41: "bg-red-600",
  42: "bg-green-600",
  43: "bg-yellow-600",
  44: "bg-blue-600",
  45: "bg-purple-600",
  46: "bg-cyan-600",
  47: "bg-white",

  // Bright background colors
  100: "bg-gray-500",
  101: "bg-red-400",
  102: "bg-green-400",
  103: "bg-yellow-400",
  104: "bg-blue-400",
  105: "bg-purple-400",
  106: "bg-cyan-400",
  107: "bg-gray-100",
};

function parseAnsiEscapeSequences(text: string): AnsiSegment[] {
  if (!text) return [];

  const segments: AnsiSegment[] = [];
  let currentSegment: AnsiSegment = { text: "" };

  // ANSI escape sequence regex: \x1b[...m
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this escape sequence
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore) {
      currentSegment.text += textBefore;
    }

    // If we have accumulated text, push the current segment
    if (currentSegment.text) {
      segments.push({ ...currentSegment });
      currentSegment = {
        text: "",
        fg: currentSegment.fg,
        bg: currentSegment.bg,
        bold: currentSegment.bold,
        dim: currentSegment.dim,
        italic: currentSegment.italic,
        underline: currentSegment.underline,
        strikethrough: currentSegment.strikethrough,
      };
    }

    // Parse the escape sequence
    const codes = match[1] ? match[1].split(";").map(Number) : [0];

    for (const code of codes) {
      if (code === 0) {
        // Reset all formatting
        currentSegment = { text: "" };
      } else if (code === 1) {
        currentSegment.bold = true;
      } else if (code === 2) {
        currentSegment.dim = true;
      } else if (code === 3) {
        currentSegment.italic = true;
      } else if (code === 4) {
        currentSegment.underline = true;
      } else if (code === 9) {
        currentSegment.strikethrough = true;
      } else if (code === 22) {
        currentSegment.bold = false;
        currentSegment.dim = false;
      } else if (code === 23) {
        currentSegment.italic = false;
      } else if (code === 24) {
        currentSegment.underline = false;
      } else if (code === 29) {
        currentSegment.strikethrough = false;
      } else if (code >= 30 && code <= 37) {
        // Standard foreground colors
        currentSegment.fg = ANSI_COLORS[code - 30];
      } else if (code >= 90 && code <= 97) {
        // Bright foreground colors
        currentSegment.fg = ANSI_COLORS[code - 90 + 8];
      } else if (code >= 40 && code <= 47) {
        // Standard background colors
        currentSegment.bg = ANSI_BG_COLORS[code];
      } else if (code >= 100 && code <= 107) {
        // Bright background colors
        currentSegment.bg = ANSI_BG_COLORS[code];
      } else if (code === 39) {
        // Default foreground color
        currentSegment.fg = undefined;
      } else if (code === 49) {
        // Default background color
        currentSegment.bg = undefined;
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  // Add remaining text
  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    currentSegment.text += remainingText;
  }

  if (currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments;
}

function fixBackspace(text: string): string {
  // Handle backspace characters like Jupyter does
  let result = text;
  let prev;
  do {
    prev = result;
    result = result.replace(/[^\n]\x08/gm, "");
  } while (result.length < prev.length);
  return result;
}

function fixCarriageReturn(text: string): string {
  // Handle carriage returns - split by \r and keep only the last part of each line
  return text
    .split("\n")
    .map((line) => {
      const parts = line.split("\r");
      return parts[parts.length - 1];
    })
    .join("\n");
}

interface AnsiOutputProps {
  children: string;
  className?: string;
  isError?: boolean;
}

export const AnsiOutput: React.FC<AnsiOutputProps> = ({
  children,
  className = "",
  isError = false,
}) => {
  if (!children || typeof children !== "string") {
    return null;
  }

  // Clean up the text
  let cleanText = fixBackspace(children);
  cleanText = fixCarriageReturn(cleanText);

  // Parse ANSI sequences
  const segments = parseAnsiEscapeSequences(cleanText);

  const baseClasses = `font-mono text-sm whitespace-pre-wrap leading-relaxed ${className}`;
  const errorClasses = isError ? "text-red-600" : "";
  const finalClasses = `${baseClasses} ${errorClasses}`.trim();

  return (
    <div className={finalClasses}>
      {segments.map((segment, index) => {
        if (!segment.text) return null;

        const classes = [];

        // Apply colors (only if not in error mode, which overrides)
        if (!isError) {
          if (segment.fg) classes.push(segment.fg);
          if (segment.bg) classes.push(segment.bg);
        }

        // Apply text decorations
        if (segment.bold) classes.push("font-bold");
        if (segment.dim) classes.push("opacity-50");
        if (segment.italic) classes.push("italic");
        if (segment.underline) classes.push("underline");
        if (segment.strikethrough) classes.push("line-through");

        const segmentClasses = classes.join(" ");

        return (
          <span key={index} className={segmentClasses || undefined}>
            {segment.text}
          </span>
        );
      })}
    </div>
  );
};

/**
 * TailwindAnsiStreamOutput component specifically for stdout/stderr rendering
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
 * TailwindAnsiErrorOutput component specifically for error messages and tracebacks
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
    </div>
  );
};
