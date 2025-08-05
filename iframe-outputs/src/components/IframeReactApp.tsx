import React, { useEffect, useState } from "react";
import { ExampleReactComponent } from "./ExampleReactComponent";

interface IframeMessage {
  type: string;
  content?: string;
  height?: number;
}

export const IframeReactApp: React.FC = () => {
  const [content, setContent] = useState<string>("");
  const [isReactMode, setIsReactMode] = useState<boolean>(false);

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
        setIsReactMode(false);
        setTimeout(sendHeight, 50);
      } else if (data && data.type === "update-react-content") {
        setContent(data.content || "");
        setIsReactMode(true);
        setTimeout(sendHeight, 50);
      }
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  // If in React mode and we have content, render the example component
  if (isReactMode && content) {
    return <ExampleReactComponent content={content} />;
  }

  // Default content or non-React mode
  return (
    <div className="dataframe-container">{content || "No content yet"}</div>
  );
};
