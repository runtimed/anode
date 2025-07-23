import React from "react";

interface IframeOutputProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
}

export const IframeOutput: React.FC<IframeOutputProps> = ({
  content,
  className,
  style,
}) => {
  return (
    <iframe
      className={className}
      width="100%"
      height="400px"
      style={style}
      srcDoc={content}
      title="Content iframe"
    />
  );
};

export default IframeOutput;
