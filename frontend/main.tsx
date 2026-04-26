// Buffer polyfill must come first — wallet adapter uses it internally.
import { Buffer } from "buffer";
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import React from "react";
import { createRoot } from "react-dom/client";
import { WalletContextProvider } from "./src/context/WalletContextProvider";
import App from "./App";

// Wallet adapter modal styles (provides the wallet selection overlay).
import "@solana/wallet-adapter-react-ui/styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error(
    "[VeilVault] Root element #root not found. Check your index.html."
  );
}

createRoot(container).render(
  <React.StrictMode>
    <WalletContextProvider>
      <App />
    </WalletContextProvider>
  </React.StrictMode>
);
