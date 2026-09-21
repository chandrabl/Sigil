/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { ContractState, emptyZswapLocalState } from "@midnight-ntwrk/compact-runtime";
import { Contract } from "../../managed/auction/contract/index.js";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Binding, Proof, SignatureEnabled, Transaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { FinalizedTransaction, TransactionId } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { createWalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { blake2b } from "@noble/hashes/blake2.js";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";

export const CONTRACT_ADDRESS = "61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507";

let lastSubmittedTxId: string | null = null;
export function getLastSubmittedTxId(): string | null {
  return lastSubmittedTxId;
}
export function resetLastSubmittedTxId(): void {
  lastSubmittedTxId = null;
}

export async function createMidnightProviders(api: any) {
  const zkConfigPath = window.location.origin;
  const keyMaterialProvider = new FetchZkConfigProvider<any>(zkConfigPath, { fetchFunc: fetch.bind(window) });
  
  let proverUri = "https://api-preprod.1am.xyz";
  let indexerUri = "https://indexer.preprod.midnight.network/api/v4/graphql";
  let indexerWsUri = "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";
  
  try {
    const config = await api.getConfiguration();
    if (config?.proverServerUri) proverUri = config.proverServerUri;
    if (config?.indexerUri) indexerUri = config.indexerUri;
    if (config?.indexerWsUri) indexerWsUri = config.indexerWsUri;
  } catch (e) {
    console.warn("Could not read wallet getConfiguration, using defaults:", e);
  }
  
  let shieldedCoinPk = "0000000000000000000000000000000000000000000000000000000000000000";
  let shieldedEncPk = "0000000000000000000000000000000000000000000000000000000000000000";
  try {
    const addresses = await api.getShieldedAddresses();
    if (addresses?.shieldedCoinPublicKey) shieldedCoinPk = addresses.shieldedCoinPublicKey;
    if (addresses?.shieldedEncryptionPublicKey) shieldedEncPk = addresses.shieldedEncryptionPublicKey;
  } catch (e) {}

  const vkCache = new Map<string, Uint8Array>();
  await Promise.all(
    ["commitBid", "revealBid", "settleAuction", "openReveal"].map(async (id) => {
      try {
        const res = await fetch(`/keys/${id}.verifier`);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          vkCache.set(id, new Uint8Array(buf));
        }
      } catch {}
    })
  );

  const base: any = indexerPublicDataProvider(indexerUri, indexerWsUri);

  let cachedContractState: ContractState | null = null;
  const buildFreshContractState = async (): Promise<ContractState> => {
    if (cachedContractState) return cachedContractState;
    try {
      const dummyContract = new Contract({});
      const res = await (dummyContract as any).initialState({
        initialPrivateState: {},
        initialZswapLocalState: emptyZswapLocalState(new Uint8Array(32) as any),
      }, new Uint8Array(32), "", 0n);
      const state: ContractState = res.currentContractState;
      injectVerifierKeys(state);
      cachedContractState = state;
      return state;
    } catch (e) {
      const empty = new ContractState();
      injectVerifierKeys(empty);
      cachedContractState = empty;
      return empty;
    }
  };

  const injectVerifierKeys = (state: ContractState): void => {
    for (const id of ["commitBid", "revealBid", "settleAuction", "openReveal"]) {
      try {
        const op = (state as any).operation?.(id);
        const vk = vkCache.get(id);
        if (op && vk && !op.verifierKey) {
          op.verifierKey = vk;
          (state as any).setOperation?.(id, op);
        }
      } catch {}
    }
  };

  const wrapState = async (raw: any): Promise<ContractState> => {
    if (raw instanceof ContractState) {
      injectVerifierKeys(raw);
      return raw;
    }
    return buildFreshContractState();
  };

  const origQueryContract = base.queryContractState?.bind(base);
  if (origQueryContract) {
    base.queryContractState = async (addr: string, config?: any) => {
      let data: any;
      const attempts = config ? [
        () => origQueryContract(addr, config),
        () => origQueryContract(addr, null),
        () => origQueryContract(addr),
      ] : [
        () => origQueryContract(addr, null),
        () => origQueryContract(addr),
      ];
      for (const attempt of attempts) {
        if (data) break;
        try {
          data = await Promise.race([attempt(), new Promise(r => setTimeout(r, 2000))]);
        } catch (e) {}
      }
      if (data) return wrapState(data);
      return buildFreshContractState();
    };
  }

  const providers = {
    privateStateProvider: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
        setContractAddress: async () => {},
        getSigningKey: async () => null,
        setSigningKey: async () => {},
        removeSigningKey: async () => {},
        clearSigningKeys: async () => {}
    } as any,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(proverUri, keyMaterialProvider),
    publicDataProvider: base,
    walletProvider: createWalletProvider({
      getCoinPublicKey: () => shieldedCoinPk,
      getEncryptionPublicKey: () => shieldedEncPk,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const serializedTx = toHex(tx.serialize());
        if (typeof api.balanceUnsealedTransaction === "function") {
          try {
            const received = await api.balanceUnsealedTransaction(serializedTx);
            return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
              "signature",
              "proof",
              "binding",
              fromHex(received.tx),
            );
          } catch (walletBalErr) {}
        }
        
        const txBytes = tx.serialize();
        const balanceResp = await fetch("https://api-preprod.1am.xyz/balance-only", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: txBytes as unknown as BodyInit,
        });
        if (balanceResp.ok) {
          const { txBytes: balancedHex } = (await balanceResp.json()) as { txBytes: string };
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
            "signature",
            "proof",
            "binding",
            fromHex(balancedHex),
          );
        }
        throw new Error("Could not balance transaction.");
      },
    }),
    midnightProvider: {
      supportedEras: ["v9"],
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        const txBytes = tx.serialize();
        const txHex = toHex(txBytes);
        const computedExtrinsicHash = toHex(blake2b(txBytes, { dkLen: 32 }));
        
        let res: any;
        if (typeof (api as any)?.submitTransaction === "function") {
          res = await (api as any).submitTransaction(txHex);
        } else if (typeof (api as any)?.submitTx === "function") {
          res = await (api as any).submitTx(txHex);
        } else {
          throw new Error("Connected wallet does not support submitTransaction");
        }
        
        let txId: string = "";
        if (typeof res === "string" && res.length > 0) {
          txId = res.replace(/^0x/, "");
        } else if (typeof res === "object" && res !== null) {
          const r = res as Record<string, any>;
          txId = (r.txHash || r.hash || r.transactionHash || r.txId || r.id || "")?.replace(/^0x/, "");
        }
        if (!txId) {
          txId = computedExtrinsicHash;
        }
        lastSubmittedTxId = txId;
        return txId as any;
      },
    },
  };

  return providers;
}

export async function getContractClient(api: any) {
  const providers = await createMidnightProviders(api);
  class AuctionContractWrapper extends (Contract as any) {
    constructor() {
      super({});
    }
  }
  const compiledContract = (CompiledContract as any).make("bboard", AuctionContractWrapper as any) as any;
  return await findDeployedContract(providers as any, {
    contractAddress: CONTRACT_ADDRESS,
    compiledContract,
    privateStateId: 'sigil-private-state',
    initialPrivateState: await providers.privateStateProvider.get('sigil-private-state')
  });
}
