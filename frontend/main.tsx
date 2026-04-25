import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    "[VeilVault] Root element #root not found. Check your index.html."
  );
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
