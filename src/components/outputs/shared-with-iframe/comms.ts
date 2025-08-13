// NOTE: code here is shared between the iframe and the parent page.
// It's done to colocate types to ensure typesafety across the two bundles.

import { OutputData } from "@/schema";
import { useEffect, useRef, useState } from "react";

const allowedToIframeEvents = ["update-outputs"] as const;
const allowedFromIframeEvents = ["iframe-height", "iframe-loaded"] as const;

type ToIframeEventType = (typeof allowedToIframeEvents)[number];
type FromIframeEventType = (typeof allowedFromIframeEvents)[number];

// Type guard helpers to ensure event types are valid
function isValidToIframeEventType(type: string): type is ToIframeEventType {
  return allowedToIframeEvents.includes(type as ToIframeEventType);
}

function isValidFromIframeEventType(type: string): type is FromIframeEventType {
  return allowedFromIframeEvents.includes(type as FromIframeEventType);
}

export type ToIframeEvent = {
  type: ToIframeEventType;
  outputs: OutputData[];
};

export type FromIframeEvent =
  | {
      type: "iframe-loaded";
    }
  | {
      type: "iframe-height";
      height: number;
    };

export function sendFromIframe(event: FromIframeEvent) {
  if (!isValidFromIframeEventType(event.type)) {
    console.error("Invalid event type", event);
    return;
  }
  window.parent.postMessage(event, "*");
}

export function sendToIframe(
  iframeElement: HTMLIFrameElement,
  data: ToIframeEvent
) {
  if (iframeElement.contentWindow) {
    if (!isValidToIframeEventType(data.type)) {
      console.error("Invalid event type", data);
      return;
    }
    iframeElement.contentWindow.postMessage(data, "*");
  } else {
    console.error("Iframe element is not loaded");
  }
}

export function addParentMessageListener(
  cb: (event: MessageEvent<FromIframeEvent>) => void
) {
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      console.error("Invalid event source", event);
      return;
    }
    if (!isValidFromIframeEventType(event.data.type)) {
      console.error("Invalid event type", event.data);
      return;
    }
    cb(event);
  });
}

export function removeParentMessageListener(
  cb: (event: MessageEvent<FromIframeEvent>) => void
) {
  window.removeEventListener("message", cb);
}

export function addIframeMessageListener(
  cb: (event: MessageEvent<ToIframeEvent>) => void
) {
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      console.error("Invalid event source", event);
      return;
    }
    if (!isValidToIframeEventType(event.data.type)) {
      console.error("Invalid event type", event.data);
      return;
    }
    cb(event);
  });
}

export function removeIframeMessageListener(
  cb: (event: MessageEvent<ToIframeEvent>) => void
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
      console.log("sending height 2", height);
      sendFromIframe({
        type: "iframe-height",
        height: height + BUFFER,
      });
    }

    // Send height on load
    // sendHeight();

    // Send height after a short delay to ensure content is rendered
    // setTimeout(sendHeight, 0);

    // Send height when content changes (for dynamic content)
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: false,
      subtree: false,
      attributes: true,
    });

    // Handle incoming content updates

    const listener = (event: MessageEvent<ToIframeEvent>) => {
      console.log("received message", event.data);
      const data = event.data;
      console.log("update-outputs", data.outputs);
      setOutputs(data.outputs || []);
    };

    addIframeMessageListener(listener);

    // After the MutationObserver setup
    const resizeObserver = new ResizeObserver(sendHeight);
    resizeObserver.observe(document.documentElement); // or document.body, or your content container

    // Capture-phase load listener to catch <img>, <video>, <iframe> loads
    // document.addEventListener("load", sendHeight, true);

    // Fonts can also change height when they finish loading
    if ("fonts" in document) {
      // Fire once all current fonts are ready
      (document as any).fonts.ready
        .then(() => {
          if (document.fonts.size > 0) {
            sendHeight();
          }
        })
        .catch(() => {});
    }

    return () => {
      removeIframeMessageListener(listener);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("load", sendHeight, true);
    };
  }, []);

  return {
    outputs,
  };
}
