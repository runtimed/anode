import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableCopyCode?: boolean;
  generateHeadingIds?: boolean;
}

interface CodeBlockProps {
  children: string;
  language?: string;
  enableCopy?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  language = "",
  enableCopy = true,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative group">
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: "#f9fafb",
          borderRadius: "0.375rem",
          padding: "0.75rem",
          fontSize: "0.875rem",
          color: "#374151",
          overflow: "auto",
        }}
        codeTagProps={{
          style: {
            color: "#374151",
            background: "transparent",
          },
        }}
      >
        {children}
      </SyntaxHighlighter>
      {enableCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-200 rounded p-1.5 text-gray-600 hover:text-gray-800 shadow-sm"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied
            ? <Check className="h-3 w-3" />
            : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
};

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "prose prose-sm max-w-none prose-gray",
  enableCopyCode = true,
  generateHeadingIds = false,
}) => {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeContent = String(children).replace(/\n$/, "");

            // Detect if this is a block-level code element
            // React Markdown renders block code inside <pre><code> and inline code as just <code>
            const isBlockCode = node?.parent?.tagName === "pre";

            return isBlockCode
              ? (
                <CodeBlock
                  language={language}
                  enableCopy={enableCopyCode}
                >
                  {codeContent}
                </CodeBlock>
              )
              : (
                <code
                  className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800`}
                  {...props}
                >
                  {children}
                </code>
              );
          },
          h1({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h1 {...props}>{children}</h1>;
            }
            const id = generateSlug(String(children));
            return (
              <h1 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h1>
            );
          },
          h2({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h2 {...props}>{children}</h2>;
            }
            const id = generateSlug(String(children));
            return (
              <h2 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h2>
            );
          },
          h3({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h3 {...props}>{children}</h3>;
            }
            const id = generateSlug(String(children));
            return (
              <h3 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h3>
            );
          },
          h4({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h4 {...props}>{children}</h4>;
            }
            const id = generateSlug(String(children));
            return (
              <h4 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h4>
            );
          },
          h5({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h5 {...props}>{children}</h5>;
            }
            const id = generateSlug(String(children));
            return (
              <h5 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h5>
            );
          },
          h6({ children, ...props }) {
            if (!generateHeadingIds) {
              return <h6 {...props}>{children}</h6>;
            }
            const id = generateSlug(String(children));
            return (
              <h6 id={id} className="group relative" {...props}>
                {children}
                <a
                  href={`#${id}`}
                  className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 no-underline"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h6>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
