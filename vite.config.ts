import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite needs these polyfills because @solana/wallet-adapter-* uses Node.js
// globals (Buffer, process) that browsers don't have natively.
export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": "{}",
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer", "@solana/web3.js", "@coral-xyz/anchor"],
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
