import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./routes.js";
import { DebugProvider } from "./components/debug/debug-mode.js";
import { Toaster } from "./components/ui/sonner.js";
import { FPSMeter } from "./components/debug/FPSMeter.js";

ReactDOM.createRoot(document.getElementById("react-app")!).render(
  <React.StrictMode>
    <DebugProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <FPSMeter />
      <Toaster />
    </DebugProvider>
  </React.StrictMode>
);
