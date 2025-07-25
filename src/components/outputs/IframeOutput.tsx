import React, { useEffect, useRef, useState } from "react";

interface IframeOutputProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
  onHeightChange?: (height: number) => void;
  defaultHeight?: string;
}

export const IframeOutput: React.FC<IframeOutputProps> = ({
  content,
  className,
  style,
  onHeightChange,
  defaultHeight = "0",
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<string>(defaultHeight);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("handleMessage", event);
      // Verify the message is from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      // Check if the message contains height data
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "iframe-height"
      ) {
        const height = event.data.height;
        if (typeof height === "number" && height > 0) {
          const newHeight = `${height + 2}px`;
          setIframeHeight(newHeight);
          onHeightChange?.(height);
        }
      }

      if (event.data && event.data.type === "iframe-loaded") {
        setIframeLoaded(true);
      }
    };

    // Add message listener
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onHeightChange]);

  useEffect(() => {
    // We cannot send content to iframe before it is loaded
    if (!iframeLoaded) {
      return;
    }
    console.log("content", content);
    // Send content to iframe when it changes
    if (iframeRef.current && iframeRef.current.contentWindow) {
      console.log("posting message");
      iframeRef.current.contentWindow.postMessage(
        {
          type: "update-content",
          content: content,
        },
        "*"
      );
    }
  }, [content, iframeLoaded]);

  return (
    <iframe
      src="http://localhost:8000"
      ref={iframeRef}
      className={className}
      width="100%"
      height={iframeHeight}
      style={style}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default IframeOutput;
