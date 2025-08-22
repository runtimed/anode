import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/sonner.js";
import { App } from "./routes.js";
import { DebugProvider } from "./debug/debug-context.js";
import { FPSMeter } from "./debug/FpsMeter.js";

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
