import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Patch CoreWallet.js to prevent WASM heap memory leaks during DUST sync
const coreWalletFile = path.resolve(
  __dirname,
  '../../node_modules/@midnight-ntwrk/wallet-sdk-dust-wallet/dist/v1/CoreWallet.js',
);

if (fs.existsSync(coreWalletFile)) {
  let content = fs.readFileSync(coreWalletFile, 'utf8');
  if (!content.includes('intermediateState.free')) {
    const oldMethod = `    applyEventsWithChanges(wallet, secretKey, events, currentTime) {
        // TODO: replace currentTime with \`updatedState.syncTime\` introduced in ledger-6.2.0-rc.1
        const stateWithChanges = wallet.state.replayEventsWithChanges(secretKey, events);
        const updatedState = stateWithChanges.state.processTtls(currentTime);
        const availableNonces = updatedState.utxos.map((utxo) => utxo.nonce);
        return [
            {
                ...wallet,
                state: updatedState,
                pendingDust: wallet.pendingDust.filter((t) => availableNonces.includes(t.nonce)),
            },
            stateWithChanges.changes,
        ];
    },`;

    const newMethod = `    applyEventsWithChanges(wallet, secretKey, events, currentTime) {
        // TODO: replace currentTime with \`updatedState.syncTime\` introduced in ledger-6.2.0-rc.1
        const oldState = wallet.state;
        const stateWithChanges = oldState.replayEventsWithChanges(secretKey, events);
        const intermediateState = stateWithChanges.state;
        const updatedState = intermediateState.processTtls(currentTime);
        const availableNonces = updatedState.utxos.map((utxo) => utxo.nonce);
        const changes = stateWithChanges.changes;
        try { stateWithChanges.free?.(); } catch {}
        try { intermediateState.free?.(); } catch {}
        try { oldState.free?.(); } catch {}
        if (typeof globalThis.gc === 'function' && Math.random() < 0.01) {
            try { globalThis.gc(); } catch {}
        }
        return [
            {
                ...wallet,
                state: updatedState,
                pendingDust: wallet.pendingDust.filter((t) => availableNonces.includes(t.nonce)),
            },
            changes,
        ];
    },`;

    if (content.includes(oldMethod)) {
      content = content.replace(oldMethod, newMethod);
      fs.writeFileSync(coreWalletFile, content, 'utf8');
      console.log('Successfully patched CoreWallet.js: freed Rust WASM objects on each sync batch!');
    } else {
      console.warn('Warning: CoreWallet.js applyEventsWithChanges exact pattern not matched, attempting regex patch...');
      const regex = /applyEventsWithChanges\(wallet, secretKey, events, currentTime\) \{[\s\S]*?return \[\s*\{\s*\.\.\.wallet,\s*state: updatedState,[\s\S]*?stateWithChanges\.changes,\s*\];\s*\},/;
      if (regex.test(content)) {
        content = content.replace(regex, newMethod);
        fs.writeFileSync(coreWalletFile, content, 'utf8');
        console.log('Successfully regex-patched CoreWallet.js: freed Rust WASM objects on each sync batch!');
      } else {
        console.error('Could not patch CoreWallet.js');
      }
    }
  } else {
    console.log('CoreWallet.js already patched.');
  }
} else {
  console.warn('CoreWallet.js not found at:', coreWalletFile);
}

// 2. Patch RunningV1Variant.js if applicable
const runningV1File = path.resolve(
  __dirname,
  '../../node_modules/@midnight-ntwrk/wallet-sdk-dust-wallet/dist/v1/RunningV1Variant.js',
);

if (fs.existsSync(runningV1File)) {
  let content = fs.readFileSync(runningV1File, 'utf8');
  const targetRegex = /Effect\.flatMap\(\(\{ changes, protocolVersion \}\) => pipe\(Effect\.forEach.*?Effect\.forkScoped\)\)/s;
  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, 'Effect.asVoid');
    fs.writeFileSync(runningV1File, content, 'utf8');
    console.log('Successfully patched RunningV1Variant.js: removed unbounded fiber memory leak!');
  }
}

