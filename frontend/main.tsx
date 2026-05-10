// Buffer polyfill must come first — wallet adapter uses it internally.
import { Buffer } from "buffer";
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { WalletContextProvider } from "./src/context/WalletContextProvider";
import App from "./App";

class RootErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    const e = this.state.error as Error | null;
    if (e) return (
      <div style={{ minHeight:"100vh", background:"#0d0e13", display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:24, gap:16, fontFamily:"monospace", color:"#e2e2e9" }}>
        <p style={{ color:"#f87171", fontWeight:700, fontSize:16 }}>⚠️ App failed to start</p>
        <pre style={{ fontSize:11, color:"#94a3b8", background:"#1a1b20", padding:16,
          borderRadius:8, maxWidth:"90vw", overflowX:"auto", whiteSpace:"pre-wrap",
          wordBreak:"break-word" }}>{e.message}{"\n"}{e.stack}</pre>
        <button type="button" onClick={() => window.location.reload()}
          style={{ padding:"10px 24px", background:"#6b5ee0", color:"#fff",
            border:"none", borderRadius:6, cursor:"pointer", fontSize:13 }}>
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

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
    <RootErrorBoundary>
      <WalletContextProvider>
        <App />
      </WalletContextProvider>
    </RootErrorBoundary>
  </React.StrictMode>
);
