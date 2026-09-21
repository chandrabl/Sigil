import { useCallback, useEffect, useState } from "react";
import {
  useLaceWallet,
  type WalletState as LaceWalletState,
  type WalletId,
} from "./useLaceWallet";
import { midnightWallet } from "../lib/midnightWallet";

export type { WalletId };

/**
 * WalletStatus values exposed to the UI.
 *
 * "not-installed"     — no window.midnight extension detected
 * "disconnected"      — detected but not connected
 * "connecting"        — provider.connect() in progress (wallet popup open)
 * "awaiting-signature"— (legacy, maps to connecting for back-compat)
 * "connected"         — live session, address available
 * "denied"            — user rejected or error
 */
export type WalletStatus =
  | "not-installed"
  | "disconnected"
  | "connecting"
  | "awaiting-signature"
  | "connected"
  | "denied";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  coinPublicKey: string | null;
  walletName: string | null;
  walletId: string | null;
  signature: string | null;
  networkId: string;
  error: string | null;
  /** Whether to show the wallet chooser modal */
  showWalletModal: boolean;
  availableWallets: LaceWalletState["availableWallets"];
  connect: (walletId?: string) => Promise<void>;
  disconnect: () => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  refreshAvailableWallets: () => LaceWalletState["availableWallets"];
}

/**
 * Derives a deterministic bidderId from a wallet address using SHA-256.
 * This is used as the on-chain identity for commit/reveal operations.
 */
export async function deriveBidderId(address: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(address)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Main wallet hook — wraps useLaceWallet and adapts its state into the
 * WalletStatus type the existing UI components expect, while also
 * synchronising the connected provider into the midnightWallet singleton
 * so useAuction.ts can call signAndSubmitTx().
 */
export function useWallet(): WalletState {
  const lace = useLaceWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Map useLaceWallet status → legacy WalletStatus
  const status: WalletStatus = (() => {
    switch (lace.status) {
      case "connected":
        return "connected";
      case "connecting":
        return "connecting";
      case "error":
        return "denied";
      case "unavailable":
        return "not-installed";
      default:
        return "disconnected";
    }
  })();

  // Sync the connected provider into the midnightWallet singleton so
  // signAndSubmitTx() gets the live API object with submitTransaction.
  useEffect(() => {
    if (
      lace.status === "connected" &&
      lace.api &&
      lace.coinPublicKey &&
      lace.address
    ) {
      midnightWallet.setConnectedProvider(
        lace.api.provider,
        lace.api.provider as unknown as import("../hooks/useLaceWallet").InjectedWalletProvider,
        lace.connectedWalletName || "Midnight Wallet",
        lace.connectedWalletId || "unknown",
        lace.address,
        lace.coinPublicKey
      );
    } else if (lace.status === "idle" || lace.status === "error") {
      midnightWallet.disconnect();
    }
  }, [lace.status, lace.api, lace.coinPublicKey, lace.address, lace.connectedWalletName, lace.connectedWalletId]);

  const openWalletModal = useCallback(() => {
    lace.refreshAvailableWallets();
    setShowWalletModal(true);
  }, [lace]);

  const closeWalletModal = useCallback(() => {
    setShowWalletModal(false);
  }, []);

  const connect = useCallback(
    async (walletId?: string) => {
      setShowWalletModal(false);
      await lace.connect(walletId as WalletId | undefined);
    },
    [lace]
  );

  return {
    status,
    address: lace.address,
    coinPublicKey: lace.coinPublicKey,
    walletName: lace.connectedWalletName,
    walletId: lace.connectedWalletId,
    signature: null,
    networkId: "preprod",
    error: lace.error,
    showWalletModal,
    availableWallets: lace.availableWallets,
    connect,
    disconnect: lace.disconnect,
    openWalletModal,
    closeWalletModal,
    refreshAvailableWallets: lace.refreshAvailableWallets,
  };
}
