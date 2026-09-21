import { useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { WalletConnectModal } from "./WalletConnectModal";
import type { WalletId } from "../hooks/useLaceWallet";

/**
 * WalletConnect — header wallet button and connection flow.
 *
 * Flow:
 *   1. Click "Connect Midnight Wallet"
 *      → opens WalletConnectModal (wallet chooser)
 *   2. User selects 1AM or Lace
 *      → modal closes, wallet extension approval popup appears (browser-native)
 *   3. User approves in extension
 *      → address shows in header, session saved to localStorage
 *   4. On page refresh
 *      → session auto-restores (no popup unless permission expired)
 *   5. Click address/disconnect button
 *      → explicit disconnect, localStorage cleared
 */
export function WalletConnect({
  onAddress,
}: {
  onAddress: (address: string | null) => void;
}) {
  const wallet = useWallet();

  useEffect(() => {
    onAddress(wallet.status === "connected" ? wallet.address : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.status, wallet.address]);

  const handleSelectWallet = async (walletId: WalletId) => {
    await wallet.connect(walletId);
  };

  return (
    <>
      {/* Wallet Chooser Modal */}
      <WalletConnectModal
        isOpen={wallet.showWalletModal}
        wallets={wallet.availableWallets}
        onSelectWallet={handleSelectWallet}
        onCancel={wallet.closeWalletModal}
      />

      {wallet.status === "connected" && wallet.address ? (
        /* ── Connected state ──────────────────────────────────────── */
        <div className="flex items-center gap-2">
          {/* Network + wallet name badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-sm border border-moss-500/30 bg-moss-500/5 px-2.5 py-1 text-[11px] text-moss-400">
            <span className="h-1.5 w-1.5 rounded-full bg-moss-400 animate-pulse" />
            <span>
              {wallet.walletName
                ? `${wallet.walletName} · Preprod`
                : "Preprod Connected"}
            </span>
          </div>

          {/* Address + disconnect button */}
          <button
            id="wallet-disconnect-btn"
            onClick={wallet.disconnect}
            className="group flex items-center gap-2 rounded-sm border border-moss-500/40 bg-moss-500/10 px-3 py-1.5 text-sm text-parchment-100 transition-colors hover:border-seal-500/50 hover:bg-seal-500/10"
            title="Click to disconnect wallet"
          >
            <span className="font-mono text-xs">
              {wallet.address.slice(0, 8)}…{wallet.address.slice(-4)}
            </span>
            <span className="text-xs text-parchment-400 group-hover:text-seal-400 transition-colors">
              ✕
            </span>
          </button>
        </div>
      ) : (
        /* ── Disconnected / connecting state ──────────────────────── */
        <div className="flex flex-col items-end gap-1">
          <button
            id="wallet-connect-btn"
            onClick={wallet.openWalletModal}
            disabled={wallet.status === "connecting"}
            className="rounded-sm border border-brass-500/50 bg-brass-500/10 px-3 py-1.5 text-sm font-medium text-brass-400 transition-colors hover:bg-brass-500/20 disabled:opacity-60 flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-brass-400 animate-pulse" />
            {wallet.status === "connecting"
              ? "Connecting…"
              : "Connect Midnight Wallet"}
          </button>

          {/* Error / not-installed message */}
          {(wallet.status === "denied" || wallet.status === "not-installed") &&
            wallet.error && (
              <span className="max-w-[260px] text-right text-xs text-seal-500">
                {wallet.error}
              </span>
            )}
        </div>
      )}
    </>
  );
}
