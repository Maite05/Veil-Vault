import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Polyfill the specific Node.js built-ins that wallet-adapter deps need
      include: ["buffer", "stream", "crypto", "events", "util", "process"],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  define: {
    "process.env": "{}",
  },
  optimizeDeps: {
    include: ["buffer", "@solana/web3.js", "@coral-xyz/anchor"],
  },
  build: {
    target: "es2020",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
