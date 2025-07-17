import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import "react-compiler-runtime";

import { App } from "./Root.js";

ReactDOM.createRoot(document.getElementById("react-app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
