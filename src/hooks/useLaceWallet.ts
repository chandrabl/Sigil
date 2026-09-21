/**
 * useLaceWallet.ts
 * -----------------------------------------------------------------------
 * Real Midnight DApp Connector wallet hook for Sigil.
 *
 * Discovers wallet extensions injected into window.midnight (1AM and/or
 * Lace), calls provider.connect("preprod") to get the shielded coin
 * public key, and persists the session in localStorage so the wallet
 * stays connected across page refreshes.  Disconnect is only triggered
 * by an explicit user action.
 *
 * Adapted from the Signet reference project:
 *   https://github.com/anshusingh97/Signet
 * -----------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";

export type WalletId = "1am" | "lace" | string;

export interface InjectedConnectionResult {
  coinPublicKey?: string;
  address?: string;
  state?: { address?: string };
  getPublicKeys?: () => Promise<{ coinPublicKey?: string }>;
  getShieldedAddresses?: () => Promise<{
    shieldedCoinPublicKey?: string;
    shieldedEncryptionPublicKey?: string;
  }>;
  getUnshieldedAddress?: () => Promise<string>;
  submitTransaction?: (payload: unknown) => Promise<string>;
  /** 1AM wallet API: signData(hexString, { encoding: 'hex' | 'base64' | 'text' }) */
  signData?: (data: string, options?: { encoding?: string }) => Promise<string>;
  [key: string]: unknown;
}

export interface InjectedWalletProvider {
  name?: string;
  icon?: string;
  apiVersion?: string;
  enable?: () => Promise<InjectedConnectionResult>;
  connect?: (networkId?: string) => Promise<InjectedConnectionResult>;
  isEnabled?: () => Promise<boolean>;
  isConnected?: () => Promise<boolean>;
  getProvingProvider?: () => unknown;
  [key: string]: unknown;
}

export interface DiscoveredWallet {
  id: WalletId;
  name: string;
  icon?: string;
  installed: boolean;
  provider?: InjectedWalletProvider;
}

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unavailable"
  | "error";

export interface WalletApi {
  coinPublicKey: string;
  address?: string;
  walletId: string;
  walletName: string;
  /** The live connected API object (has submitTransaction, signData, etc.) */
  provider: InjectedConnectionResult;
}

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  coinPublicKey: string | null;
  connectedWalletId: WalletId | null;
  connectedWalletName: string | null;
  error: string | null;
  api: WalletApi | null;
  availableWallets: DiscoveredWallet[];
  connect: (walletId?: WalletId) => Promise<void>;
  disconnect: () => void;
  refreshAvailableWallets: () => DiscoveredWallet[];
}

const STORAGE_KEY = "sigil_wallet_connected";
const STORAGE_WALLET_ID = "sigil_wallet_id";

/**
 * Inspect window.midnight and return all installed wallet providers.
 * Checks for 1AM and Lace by their well-known injection keys, plus any
 * other midnight-compatible wallet that happens to be installed.
 */
export function discoverMidnightWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined") return [];

  const midnight = (
    window as unknown as {
      midnight?: Record<string, InjectedWalletProvider>;
    }
  ).midnight;

  const discovered: DiscoveredWallet[] = [];

  // ── 1AM Wallet ─────────────────────────────────────────────────────
  // 1AM can inject as window.midnight["1am"], .oneam, or "1AM"
  let oneAmProvider =
    midnight?.["1am"] || midnight?.oneam || midnight?.["1AM"];

  if (!oneAmProvider && midnight) {
    for (const key of Object.keys(midnight)) {
      const entry = midnight[key];
      if (
        key.toLowerCase().includes("1am") ||
        (entry?.name && entry.name.toLowerCase().includes("1am"))
      ) {
        oneAmProvider = entry;
        break;
      }
    }
  }

  discovered.push({
    id: "1am",
    name: oneAmProvider?.name || "1AM Wallet",
    icon: oneAmProvider?.icon,
    installed: !!oneAmProvider,
    provider: oneAmProvider,
  });

  // ── Lace Wallet ────────────────────────────────────────────────────
  let laceProvider = midnight?.mnLace;
  if (!laceProvider && midnight) {
    for (const key of Object.keys(midnight)) {
      const entry = midnight[key];
      if (
        key.toLowerCase().includes("lace") ||
        (entry?.name && entry.name.toLowerCase().includes("lace"))
      ) {
        laceProvider = entry;
        break;
      }
    }
  }

  discovered.push({
    id: "lace",
    name: laceProvider?.name || "Lace Wallet",
    icon: laceProvider?.icon,
    installed: !!laceProvider,
    provider: laceProvider,
  });

  // ── Any other midnight-compatible wallet ───────────────────────────
  if (midnight) {
    for (const key of Object.keys(midnight)) {
      if (
        key !== "1am" &&
        key !== "oneam" &&
        key !== "1AM" &&
        key !== "mnLace" &&
        !discovered.some((d) => d.provider === midnight[key])
      ) {
        const item = midnight[key];
        if (typeof item === "object" && item !== null) {
          discovered.push({
            id: key,
            name: item.name || `Midnight Wallet (${key})`,
            icon: item.icon,
            installed: true,
            provider: item,
          });
        }
      }
    }
  }

  return discovered;
}

export function useLaceWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [connectedWalletId, setConnectedWalletId] =
    useState<WalletId | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<WalletApi | null>(null);

  const [availableWallets, setAvailableWallets] = useState<DiscoveredWallet[]>(
    () => discoverMidnightWallets()
  );

  const refreshAvailableWallets = useCallback(() => {
    const list = discoverMidnightWallets();
    setAvailableWallets(list);
    return list;
  }, []);

  // Re-discover when extension loads (may load after React)
  useEffect(() => {
    refreshAvailableWallets();
    const timer = setTimeout(refreshAvailableWallets, 800);
    return () => clearTimeout(timer);
  }, [refreshAvailableWallets]);

  /**
   * Core connect logic given a resolved provider.
   * Calls provider.connect("preprod") — this is the call that triggers
   * the wallet extension's native approval popup in the browser.
   * If already enabled, some wallets resolve silently (used for auto-reconnect).
   */
  const doConnectWithProvider = useCallback(
    async (
      provider: InjectedWalletProvider,
      walletId: WalletId,
      walletName: string
    ) => {
      setStatus("connecting");
      setError(null);

      try {
        let connResult: InjectedConnectionResult | null = null;

        // Try connect("preprod") first, then fallback to enable() if connect isn't there
        if (typeof provider.connect === "function") {
          try {
            connResult = await provider.connect("preprod");
          } catch (connectErr) {
            console.error("provider.connect('preprod') failed:", connectErr);
            try {
              connResult = await provider.connect();
            } catch (fallbackErr) {
              console.error("Fallback provider.connect() also failed:", fallbackErr);
              if (typeof provider.enable === "function") {
                console.log("Trying provider.enable() as a last resort...");
                connResult = await provider.enable();
              } else {
                const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
                if (fallbackMsg.includes("Invalid network ID: undefined")) {
                   throw connectErr; // the original error is the real reason
                }
                throw fallbackErr;
              }
            }
          }
        } else if (typeof provider.enable === "function") {
          connResult = await provider.enable();
        } else {
          throw new Error(
            `${walletName} does not expose enable() or connect(). ` +
              `Please ensure the extension is configured for Midnight Preprod.`
          );
        }

        // Extract the shielded coin public key / address from connection result
        let resolvedCpk: string | null = null;

        // Try getPublicKeys() first (some versions)
        if (typeof connResult?.getPublicKeys === "function") {
          try {
            const keys = await connResult.getPublicKeys();
            resolvedCpk = keys?.coinPublicKey ?? null;
          } catch {
            // ignore
          }
        }

        // Try getShieldedAddresses() (Lace / standard Midnight DApp Connector)
        if (!resolvedCpk && typeof connResult?.getShieldedAddresses === "function") {
          try {
            const shielded = await connResult.getShieldedAddresses!();
            resolvedCpk =
              shielded?.shieldedCoinPublicKey ||
              shielded?.shieldedEncryptionPublicKey ||
              null;
          } catch {
            // ignore
          }
        }

        // Try getUnshieldedAddress() fallback
        if (!resolvedCpk && typeof connResult?.getUnshieldedAddress === "function") {
          try {
            resolvedCpk = await connResult.getUnshieldedAddress!();
          } catch {
            // ignore
          }
        }

        const cpk =
          resolvedCpk ||
          connResult?.coinPublicKey ||
          connResult?.address ||
          connResult?.state?.address ||
          "midnight-wallet-user";

        const addr = connResult?.address || cpk;

        const walletApiObj: WalletApi = {
          coinPublicKey: cpk,
          address: addr,
          walletId,
          walletName,
          provider: connResult || (provider as unknown as InjectedConnectionResult),
        };

        setCoinPublicKey(cpk);
        setAddress(addr);
        setConnectedWalletId(walletId);
        setConnectedWalletName(walletName);
        setApi(walletApiObj);
        setStatus("connected");

        // Persist session so auto-reconnect works on next page load
        localStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(STORAGE_WALLET_ID, walletId);
      } catch (e) {
        setStatus("error");
        const msg =
          e instanceof Error
            ? e.message
            : "Wallet connection was declined or timed out.";
        setError(msg);
      }
    },
    []
  );

  // ── Auto-reconnect on page load ────────────────────────────────────
  // If the user previously connected, silently re-establish the session
  // without showing any approval popup (the extension caches permission).
  useEffect(() => {
    const wasConnected = localStorage.getItem(STORAGE_KEY) === "true";
    const savedWalletId = localStorage.getItem(STORAGE_WALLET_ID);
    if (!wasConnected) return;

    const tryReconnect = async () => {
      const wallets = discoverMidnightWallets();
      const target =
        wallets.find((w) => w.id === savedWalletId && w.installed) ||
        wallets.find((w) => w.installed);

      if (!target?.provider) {
        // Extension not loaded yet — clear storage so we don't loop
        return;
      }

      try {
        await doConnectWithProvider(target.provider, target.id, target.name);
      } catch {
        // Permission was revoked — clear so we don't retry forever
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_WALLET_ID);
      }
    };

    // Small delay to give the extension time to inject into window.midnight
    const timer = setTimeout(tryReconnect, 900);
    return () => clearTimeout(timer);
  }, [doConnectWithProvider]);

  // ── Public connect ─────────────────────────────────────────────────
  const connect = useCallback(
    async (preferredWalletId?: WalletId) => {
      setError(null);
      const wallets = discoverMidnightWallets();
      setAvailableWallets(wallets);

      let chosen: DiscoveredWallet | undefined;

      if (preferredWalletId) {
        chosen = wallets.find((w) => w.id === preferredWalletId);
      } else {
        // Default preference: 1AM → Lace → first installed
        chosen =
          wallets.find((w) => w.id === "1am" && w.installed) ||
          wallets.find((w) => w.id === "lace" && w.installed) ||
          wallets.find((w) => w.installed);
      }

      if (!chosen || !chosen.installed || !chosen.provider) {
        setStatus("unavailable");
        const label =
          preferredWalletId === "1am"
            ? "1AM Wallet"
            : preferredWalletId === "lace"
            ? "Lace Wallet"
            : "a Midnight wallet (1AM or Lace)";
        setError(
          `${label} extension not detected. ` +
            `Please install and configure it for Midnight Preprod.`
        );
        return;
      }

      await doConnectWithProvider(chosen.provider, chosen.id, chosen.name);
    },
    [doConnectWithProvider]
  );

  // ── Disconnect ─────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    setAddress(null);
    setCoinPublicKey(null);
    setConnectedWalletId(null);
    setConnectedWalletName(null);
    setApi(null);
    setStatus("idle");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_WALLET_ID);
  }, []);

  return {
    status,
    address,
    coinPublicKey,
    connectedWalletId,
    connectedWalletName,
    error,
    api,
    availableWallets,
    connect,
    disconnect,
    refreshAvailableWallets,
  };
}

/** Semantic alias */
export const useMidnightWallet = useLaceWallet;
