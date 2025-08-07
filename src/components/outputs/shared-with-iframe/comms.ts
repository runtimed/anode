import { OutputData } from "@/schema";
import { useEffect, useRef, useState } from "react";

type UpdateOutputsEvent = {
  type: "update-outputs";
  outputs: OutputData[];
};

type IframeLoadedEvent = {
  type: "iframe-loaded";
};

type IframeHeightEvent = {
  type: "iframe-height";
  height: number;
};

export type ToIframeEvent = UpdateOutputsEvent;
export type FromIframeEvent = IframeHeightEvent | IframeLoadedEvent;

export function sendFromIframe(event: FromIframeEvent) {
  window.parent.postMessage(event, "*");
}

export function sendToIframe(
  iframeElement: HTMLIFrameElement,
  data: ToIframeEvent
) {
  if (iframeElement.contentWindow) {
    iframeElement.contentWindow.postMessage(data, "*");
  } else {
    console.error("Iframe element is not loaded");
  }
}

export function addParentMessageListener(
  cb: (event: MessageEvent<FromIframeEvent>) => void
) {
  window.addEventListener("message", cb);
}

export function removeParentMessageListener(
  cb: (event: MessageEvent<FromIframeEvent>) => void
) {
  window.removeEventListener("message", cb);
}

export function useIframeCommsParent({
  defaultHeight,
  onHeightChange,
  outputs,
}: {
  defaultHeight: string;
  onHeightChange?: (height: number) => void;
  outputs?: OutputData[];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<string>(defaultHeight);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<FromIframeEvent>) => {
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

      if (event.data && event.data.type === "iframe-loaded") {
        setIframeLoaded(true);
      }
    };

    // Add message listener
    addParentMessageListener(handleMessage);

    return () => {
      removeParentMessageListener(handleMessage);
    };
  }, [onHeightChange]);

  useEffect(() => {
    // We cannot send content to iframe before it is loaded
    if (!iframeLoaded) {
      return;
    }
    // Send content to iframe when it changes
    if (iframeRef.current && iframeRef.current.contentWindow) {
      console.log("Sending outputs to iframe", outputs);
      sendToIframe(iframeRef.current, {
        type: "update-outputs",
        outputs: outputs || [],
      });
    }
  }, [outputs, iframeLoaded]);

  return {
    iframeRef,
    iframeLoaded,
    iframeHeight,
  };
}

export function useIframeCommsChild() {
  const [outputs, setOutputs] = useState<OutputData[]>([]);

  useEffect(() => {
    function sendHeight() {
      const BUFFER = 1; // Add a small buffer to prevent scrollbars
      const height = document.body.scrollHeight;
      sendFromIframe({
        type: "iframe-height",
        height: height + BUFFER,
      });
    }

    // Send height on load
    sendHeight();

    // Send height after a short delay to ensure content is rendered
    setTimeout(sendHeight, 0);

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
    window.addEventListener("message", (event: MessageEvent<ToIframeEvent>) => {
      console.log("received message", event.data);
      const data = event.data;
      if (data && data.type === "update-outputs") {
        console.log("update-outputs", data.outputs);
        setOutputs(data.outputs || []);
        setTimeout(sendHeight, 0);
      }
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  return {
    outputs,
  };
}
