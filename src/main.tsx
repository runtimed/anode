import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/routes.tsx";
import { DebugProvider } from "@/components/debug/debug-mode.js";

// Import console launcher to make it available globally
import "./runtime/console-launcher.js";

ReactDOM.createRoot(document.getElementById("react-app")!).render(
  <React.StrictMode>
    <DebugProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DebugProvider>
  </React.StrictMode>
);
