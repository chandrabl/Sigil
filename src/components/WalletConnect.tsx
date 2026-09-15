import { useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { SignatureModal } from "./SignatureModal";

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

  return (
    <>
      <SignatureModal
        isOpen={wallet.promptSignatureModal}
        onSign={wallet.confirmSignature}
        onReject={wallet.cancelSignature}
      />

      {wallet.status === "connected" && wallet.address ? (
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-sm border border-moss-500/30 bg-moss-500/5 px-2.5 py-1 text-[11px] text-moss-400">
            <span className="h-1.5 w-1.5 rounded-full bg-moss-400 animate-pulse" />
            <span>Preprod Signed</span>
          </div>
          <button
            onClick={wallet.disconnect}
            className="group flex items-center gap-2 rounded-sm border border-moss-500/40 bg-moss-500/10 px-3 py-1.5 text-sm text-parchment-100 transition-colors hover:border-seal-500/50 hover:bg-seal-500/10"
            title="Click to disconnect"
          >
            <span className="font-mono text-xs">
              {wallet.address.slice(0, 8)}…{wallet.address.slice(-4)}
            </span>
            <span className="text-xs text-parchment-400 group-hover:text-parchment-100">
              ✕
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => wallet.connect()}
            disabled={wallet.status === "connecting"}
            className="rounded-sm border border-brass-500/50 bg-brass-500/10 px-3 py-1.5 text-sm font-medium text-brass-400 transition-colors hover:bg-brass-500/20 disabled:opacity-60 flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-brass-400" />
            {wallet.status === "connecting"
              ? "Awaiting Signature…"
              : "Connect Midnight Wallet"}
          </button>
          {wallet.status === "denied" && wallet.error && (
            <span className="max-w-[240px] text-right text-xs text-seal-500">
              {wallet.error}
            </span>
          )}
        </div>
      )}
    </>
  );
}
