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
  enforce: "pre",
  transform(code, id) {
    let patched = code;

    // Patch 1: compact-runtime coerceToChargedState – replace instanceof check with duck-type
    if (id.includes("compact-runtime")) {
      patched = patched.replace(
        "else if (contractState instanceof ocrt.ContractState)",
        "else if (contractState && contractState.data)"
      );
    }

    // Patch 2: generated contract code compiled against old compact-runtime.
    // The managed/auction/contract/index.js is already patched on disk; this
    // covers any edge case where Vite resolves the file from a different path.
    if (id.includes("managed") || id.includes("auction")) {
      // Insert circuitId arg if the old 4-arg form is still present (safety net)
      patched = patched.replace(
        /(__compactRuntime\.createCircuitContext)\((__compactRuntime\.dummyContractAddress\(\)), (constructorContext_\d+\.initialZswapLocalState\.coinPublicKey), (state_\d+), (constructorContext_\d+\.initialPrivateState)\)/g,
        "$1('__init__', $2, $3, $4, $5)"
      );
      // Inject the callContext shim after createCircuitContext if not already present
      patched = patched.replace(
        /const context = __compactRuntime\.createCircuitContext\('__init__',[^;]+\);(?!\s*\/\/ Shim)/g,
        (match) => match + `\n    if (context.callContext && !context.currentQueryContext) { Object.defineProperty(context, 'currentQueryContext', { get: () => context.callContext.currentQueryContext, configurable: true }); }\n    if (context.callContext && context.currentPrivateState === undefined) { Object.defineProperty(context, 'currentPrivateState', { get: () => context.callContext.currentPrivateState, configurable: true }); }\n    if (context.callContext && context.currentZswapLocalState === undefined) { Object.defineProperty(context, 'currentZswapLocalState', { get: () => context.callContext.currentZswapLocalState, configurable: true }); }`
      );
    }

    if (patched !== code) {
      console.log("[vite] patched", id);
    }
    return { code: patched, map: null };
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
