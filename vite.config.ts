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

    // Patch 2: generated contract code compiled against old compact-runtime that lacked the
    // leading circuitId param on createCircuitContext. The old call was:
    //   createCircuitContext(dummyContractAddress(), coinPk, contractState, privateState)
    // The new API is:
    //   createCircuitContext(circuitId, contractAddress, coinPk, contractState, privateState)
    // We insert a synthetic circuitId ('__init__') and swap the args so contractState lands
    // in the right slot instead of privateState.
    if (id.includes("managed") || id.includes("auction")) {
      // Match the exact pattern emitted by the Compact compiler for the initialState() call
      patched = patched.replace(
        /(__compactRuntime\.createCircuitContext)\((__compactRuntime\.dummyContractAddress\(\)), (constructorContext_\d+\.initialZswapLocalState\.coinPublicKey), (state_\d+), (constructorContext_\d+\.initialPrivateState)\)/g,
        "$1('__init__', $2, $3, $4, $5)"
      );
      // Also patch the per-circuit calls: old = createCircuitContext(address, coinPk, state, ps)
      // These appear in the individual circuit methods (commitBid etc.)
      patched = patched.replace(
        /(__compactRuntime\.createCircuitContext)\((context_\d+\.contractAddress|contractAddress_\d+), (context_\d+\.zswapLocalState|coinPublicKey_\d+|context_\d+\.coinPublicKey), (contractState_\d+|state_\d+), (privateState_\d+|context_\d+\.privateState)\)/g,
        "$1(context.circuitId ?? '__call__', $2, $3, $4, $5)"
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
