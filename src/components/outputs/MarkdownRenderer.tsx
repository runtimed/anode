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
    <div className="group/codeblock relative">
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "0.75rem",
          fontSize: "0.875rem",
          overflow: "auto",
          background: "#fafafa",
          borderRadius: "0.375rem",
        }}
      >
        {children}
      </SyntaxHighlighter>
      {enableCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 rounded border border-gray-200 bg-white p-1.5 text-gray-600 opacity-0 shadow-sm transition-opacity group-hover/codeblock:opacity-100 hover:bg-gray-50 hover:text-gray-800"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
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
    <div className={`${className} [&_pre]:!bg-gray-50`}>
      <ReactMarkdown
        components={{
          img({ src, alt, ...props }) {
            // Prevent empty src attribute warnings
            if (!src || src === "") {
              return null;
            }
            return <img src={src} alt={alt} {...props} />;
          },
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeContent = String(children).replace(/\n$/, "");

            // Simple detection: block code has newlines, inline code doesn't
            const isBlockCode = codeContent.includes("\n") || className;

            return isBlockCode ? (
              <CodeBlock language={language} enableCopy={enableCopyCode}>
                {codeContent}
              </CodeBlock>
            ) : (
              <code
                className={`${className} rounded bg-gray-100 px-1 py-0.5 text-sm text-gray-800`}
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
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
                  className="absolute top-0 -left-6 text-gray-400 no-underline opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600"
                  aria-label="Link to this heading"
                >
                  #
                </a>
              </h6>
            );
          },
          hr({ ...props }) {
            return (
              <hr className="!my-4 !border-t !border-gray-300" {...props} />
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
