import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import type { Plugin } from "vite";

// Patch @midnight-ntwrk/compact-runtime at Vite transform time.
// The SDK's coerceToChargedState() uses `instanceof ContractState` which fails when
// multiple module copies exist (Vite bundler isolation). We replace it with a duck-type
// check on `.data` which is always set on a real ContractState object.
const patchCompactRuntime: Plugin = {
  name: "patch-compact-runtime",
  transform(code, id) {
    if (
      id.includes("@midnight-ntwrk/compact-runtime") &&
      id.includes("circuit-context")
    ) {
      const patched = code.replace(
        "else if (contractState instanceof ocrt.ContractState)",
        "else if (contractState && contractState.data)"
      );
      if (patched !== code) {
        console.log("[vite] patched compact-runtime coerceToChargedState");
      }
      return { code: patched, map: null };
    }
  },
};

export default defineConfig({
  plugins: [react(), wasm(), patchCompactRuntime],
  build: {
    target: "esnext",
  },
  test: {
    environment: "node",
    globals: false,
  },
  resolve: {
    dedupe: ["@midnight-ntwrk/compact-runtime"],
  },
});
