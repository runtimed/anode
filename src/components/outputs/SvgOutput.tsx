import React from "react";

interface SvgOutputProps {
  content: string;
  maxHeight?: string;
}

export const SvgOutput: React.FC<SvgOutputProps> = ({
  content,
  maxHeight = "400px",
}) => {
  return (
    <div className="py-2">
      <div
        className="max-w-full overflow-hidden"
        style={{ maxHeight }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default SvgOutput;
