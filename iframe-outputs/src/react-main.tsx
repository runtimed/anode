import { createRoot } from "react-dom/client";
import { IframeReactApp } from "./components/IframeReactApp";
import "./style.css";
import { sendFromIframe } from "@/components/outputs/shared-with-iframe/comms";

// Main React initialization for iframe outputs
function initializeReactIframe() {
  const container = document.getElementById("react-root");
  if (!container) {
    console.error("React root element not found");
    return;
  }

  const root = createRoot(container);
  root.render(<IframeReactApp />);

  // Send iframe loaded message
  sendFromIframe({ type: "iframe-loaded" });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeReactIframe);
} else {
  initializeReactIframe();
}
