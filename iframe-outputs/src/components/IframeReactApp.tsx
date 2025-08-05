import React, { useEffect, useState } from "react";
import ReactJsonView from "@microlink/react-json-view";

interface IframeMessage {
  type: string;
  content?: string;
  height?: number;
}

export const IframeReactApp: React.FC = () => {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    document.body.style.margin = "0";

    function sendHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage(
        {
          type: "iframe-height",
          height: height,
        },
        "*"
      );
    }

    // Send height on load
    sendHeight();

    // Send height after a short delay to ensure content is rendered
    setTimeout(sendHeight, 100);

    // Send height when content changes (for dynamic content)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Also send height on resize
    window.addEventListener("resize", sendHeight);

    // Handle incoming content updates
    window.addEventListener("message", (event) => {
      const data: IframeMessage = event.data;
      if (data && data.type === "update-content") {
        setContent(data.content || "");
        setTimeout(sendHeight, 50);
      } else if (data && data.type === "update-react-content") {
        setContent(data.content || "");
        setTimeout(sendHeight, 50);
      }
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  // Default content or non-React mode
  return (
    <div className="dataframe-container">
      {(content && (
        <ReactJsonView
          src={JSON.parse(content)}
          theme="rjv-default"
          collapsed={false}
          displayDataTypes={false}
          displayObjectSize={false}
          enableClipboard={true}
          indentWidth={2}
          iconStyle="triangle"
          style={{
            backgroundColor: "transparent",
            fontSize: "0.875rem",
          }}
        />
      )) ||
        "No content yet"}
    </div>
  );
};
