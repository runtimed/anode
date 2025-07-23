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
          const newHeight = `${height}px`;
          setIframeHeight(newHeight);
          onHeightChange?.(height);
        }
      }
    };

    // Add message listener
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onHeightChange]);

  // Create enhanced content with height measurement script
  const enhancedContent = `
      <div class="iframe-content">
      ${content}
      </div>
      <script>
        document.body.style.margin = "0";
        
        function sendHeight() {
          const height = document.querySelector('.iframe-content').scrollHeight;
          window.parent.postMessage({
            type: 'iframe-height',
            height: height
          }, '*');
        }
        
        // Send height on load
        window.addEventListener('load', sendHeight);
        
        // Send height after a short delay to ensure content is rendered
        setTimeout(sendHeight, 100);
        
        // Send height when content changes (for dynamic content)
        const observer = new MutationObserver(sendHeight);
        observer.observe(document.querySelector('.iframe-content'), {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        // Also send height on resize
        window.addEventListener('resize', sendHeight);
      </script>
  `;

  return (
    <iframe
      ref={iframeRef}
      className={className}
      width="100%"
      height={iframeHeight}
      style={style}
      srcDoc={enhancedContent}
      title="Content iframe"
    />
  );
};

export default IframeOutput;
