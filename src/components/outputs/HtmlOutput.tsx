import React, { useEffect, useRef } from "react";

interface HtmlOutputProps {
  content: string;
  className?: string;
}

export const HtmlOutput: React.FC<HtmlOutputProps> = ({
  content,
  className = "max-w-none dataframe-container",
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use createContextualFragment for efficient HTML/SVG parsing and script execution
    // Without this, scripts don't run
    const range = document.createRange();
    const fragment = range.createContextualFragment(content);
    if (ref.current) {
      ref.current.innerHTML = "";
      ref.current.appendChild(fragment);
    }
  }, [content]);

  return (
    // TODO: if not in an iframe, we should create one
    <div ref={ref} className={className} />
  );
};

export default HtmlOutput;
