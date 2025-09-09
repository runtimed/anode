// 🚨 IMPORTANT: code here is shared between the iframe and the parent page.
// It's done to colocate types to ensure typesafety across the two bundles.

import { OutputData } from "@/schema";
import { useEffect, useRef, useState } from "react";

// ---
// NOTE: source of truth here. Updates here propogate down

const allowedToIframeEvents = ["update-outputs"] as const;
const allowedFromIframeEvents = ["iframe-height", "iframe-loaded"] as const;

// ---

type ToIframeEventName = (typeof allowedToIframeEvents)[number];
type FromIframeEventName = (typeof allowedFromIframeEvents)[number];

// Type guard helpers to ensure event types are valid
function isValidToIframeEventType(type: string): type is ToIframeEventName {
  return allowedToIframeEvents.includes(type as ToIframeEventName);
}

function isValidFromIframeEventType(type: string): type is FromIframeEventName {
  return allowedFromIframeEvents.includes(type as FromIframeEventName);
}

export type ToIframeEvent = {
  type: "update-outputs";
  outputs: OutputData[];
};

export type FromIframeEvent =
  | { type: "iframe-loaded" }
  | { type: "iframe-height"; height: number };

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
    const targetOrigin = new URL(import.meta.env.VITE_IFRAME_OUTPUT_URI).origin;
    iframeElement.contentWindow.postMessage(data, targetOrigin);
  } else {
    console.error("Iframe element is not loaded");
  }
}

export function addParentMessageListener(
  cb: (event: MessageEvent<FromIframeEvent>) => void
) {
  window.addEventListener("message", (event) => {
    // Don't print errors because Chrome extensions can send `postMessage` events.
    // We don't want to error in these cases.
    if (event.source !== window.parent) {
      return;
    }
    if (!isValidFromIframeEventType(event.data.type)) {
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
    // Don't print errors because Chrome extensions can send `postMessage` events.
    // We don't want to error in these cases.
    if (event.source !== window.parent) {
      return;
    }
    if (!isValidToIframeEventType(event.data.type)) {
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

    // Handle incoming content updates

    const listener = (event: MessageEvent<ToIframeEvent>) => {
      const data = event.data;
      setOutputs(data.outputs || []);
    };

    addIframeMessageListener(listener);

    // After the MutationObserver setup
    const resizeObserver = new ResizeObserver(sendHeight);
    resizeObserver.observe(document.documentElement); // or document.body, or your content container

    // Capture-phase load listener to catch <img>, <video>, <iframe> loads
    document.addEventListener("load", sendHeight, true);

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
      resizeObserver.disconnect();
      document.removeEventListener("load", sendHeight, true);
    };
  }, []);

  return {
    outputs,
  };
}
