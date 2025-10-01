import "./index.css";

import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { DebugProvider } from "@/components/debug/debug-mode.js";

const App = React.lazy(() =>
  import("@/routes.tsx").then((mod) => ({ default: mod.App }))
);

// Import console launcher to make it available globally
import "./runtime/console-launcher.js";

// Import AI provider to make it available globally
import "./runtime/ai-provider.js";
import { LoadingState } from "./components/loading/LoadingState.js";

// Verify launcher is available
if (typeof window !== "undefined" && window.__RUNT_LAUNCHER__) {
  console.log("🎯 Console Runtime Launcher loaded successfully!");
  console.log("Try: window.__RUNT_LAUNCHER__.getStatus()");
}

// Verify AI provider is available
if (typeof window !== "undefined" && window.__RUNT_AI__) {
  console.log("🤖 AI Provider loaded successfully!");
  console.log("Try: window.__RUNT_AI__.getStatus()");
}

ReactDOM.createRoot(document.getElementById("react-app")!).render(
  <React.StrictMode>
    <DebugProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <LoadingState variant="fullscreen" message="Loading app..." />
          }
        >
          <App />
        </Suspense>
      </BrowserRouter>
    </DebugProvider>
  </React.StrictMode>
);
