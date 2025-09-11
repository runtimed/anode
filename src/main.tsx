import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/routes.tsx";
import { DebugProvider } from "@/components/debug/debug-mode.js";
import { ChatModeProvider } from "@/hooks/useChatMode.tsx";

ReactDOM.createRoot(document.getElementById("react-app")!).render(
  <React.StrictMode>
    <DebugProvider>
      <ChatModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ChatModeProvider>
    </DebugProvider>
  </React.StrictMode>
);
