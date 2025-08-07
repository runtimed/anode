// Main entry point for iframe outputs
// This file will be processed by Vite and bundled with the HTML

// Import any styles if needed
import "./style.css";

// Main initialization code
function initializeIframe() {
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
  window.addEventListener("load", sendHeight);

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
    if (event.data && event.data.type === "update-content") {
      // Clear existing content
      document.body.innerHTML = "";

      // Use createContextualFragment for efficient HTML/SVG parsing and script execution
      const range = document.createRange();
      const fragment = range.createContextualFragment(event.data.content);
      document.body.appendChild(fragment);

      // Send height after content update
      setTimeout(sendHeight, 50);
    }
  });

  // Send iframe loaded message
  window.parent.postMessage(
    {
      type: "iframe-loaded",
    },
    "*"
  );
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeIframe);
} else {
  initializeIframe();
}
