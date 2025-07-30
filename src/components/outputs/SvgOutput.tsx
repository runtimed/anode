import React from "react";
import IframeOutput from "./IframeOutput";

interface SvgOutputProps {
  content: string;
}

export const SvgOutput: React.FC<SvgOutputProps> = ({ content }) => {
  return (
    <div className="py-2">
      <IframeOutput
        className="max-w-full overflow-hidden"
        content={String(content || "")}
      />
    </div>
  );
};

export default SvgOutput;
