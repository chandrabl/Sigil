import { useCallback, useEffect, useState } from "react";
import { midnightWallet, type MidnightWalletState } from "../lib/midnightWallet";

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
  walletName: string | null;
  signature: string | null;
  networkId: string;
  error: string | null;
  promptSignatureModal: boolean;
  connect: (walletId?: string) => Promise<void>;
  confirmSignature: () => Promise<void>;
  cancelSignature: () => void;
  disconnect: () => void;
}

/**
 * bidderId used on-chain is derived from the connected wallet address, not
 * the raw address itself, so the UI never has to reason about the two
 * separately.
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

export function useWallet(): WalletState {
  const [walletState, setWalletState] = useState<MidnightWalletState>(() =>
    midnightWallet.getState()
  );
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [promptSignatureModal, setPromptSignatureModal] = useState(false);
  const [pendingWalletId, setPendingWalletId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = midnightWallet.subscribe((s) => {
      setWalletState(s);
      if (s.isConnected) {
        setStatus("connected");
      } else if (s.error) {
        setStatus("denied");
      } else {
        setStatus("disconnected");
      }
    });
    return unsub;
  }, []);

  const connect = useCallback(async (walletId?: string) => {
    setPendingWalletId(walletId);
    setPromptSignatureModal(true);
    setStatus("awaiting-signature");
  }, []);

  const confirmSignature = useCallback(async () => {
    setStatus("connecting");
    setPromptSignatureModal(false);
    try {
      await midnightWallet.connect(pendingWalletId);
    } catch {
      setStatus("denied");
    }
  }, [pendingWalletId]);

  const cancelSignature = useCallback(() => {
    setPromptSignatureModal(false);
    setStatus("disconnected");
  }, []);

  const disconnect = useCallback(() => {
    midnightWallet.disconnect();
    setStatus("disconnected");
  }, []);

  return {
    status,
    address: walletState.address,
    walletName: walletState.walletName,
    signature: walletState.signature,
    networkId: walletState.networkId,
    error: walletState.error,
    promptSignatureModal,
    connect,
    confirmSignature,
    cancelSignature,
    disconnect,
  };
}
