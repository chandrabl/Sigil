interface SignatureModalProps {
  isOpen: boolean;
  onSign: () => void;
  onReject: () => void;
}

export function SignatureModal({ isOpen, onSign, onReject }: SignatureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-lg border border-brass-500/40 bg-ink-900/95 p-6 shadow-2xl shadow-brass-950/50">
        <div className="flex items-center justify-between border-b border-ink-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rotate-45 bg-brass-400" />
            <h3 className="font-display text-base font-semibold text-parchment-100">
              Midnight Signature Request
            </h3>
          </div>
          <span className="rounded bg-brass-500/10 px-2 py-0.5 font-mono text-[11px] text-brass-400 border border-brass-500/30">
            Preprod
          </span>
        </div>

        <div className="mt-4 space-y-3 text-xs text-parchment-300">
          <p className="text-parchment-200">
            Sigil requests your cryptographic signature to authenticate this session and verify on-chain permissions.
          </p>

          <div className="rounded border border-ink-700 bg-ink-950/80 p-3 font-mono text-[11px] space-y-1.5">
            <div className="text-parchment-400">Network: <span className="text-parchment-200">Midnight Preprod (Testnet)</span></div>
            <div className="text-parchment-400">DApp: <span className="text-parchment-200">Sigil Sealed-Bid Auction</span></div>
            <div className="text-parchment-400">Type: <span className="text-brass-400">Session Authorization / Shielded Handshake</span></div>
            <div className="text-parchment-400 break-all">Challenge: <span className="text-parchment-300">sigil_auth_token_0x9b4f2c1d8a0e7a5f</span></div>
          </div>

          <p className="text-[11px] text-parchment-400 italic">
            Signing this message incurs zero gas fees and does not authorize token transfers.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-ink-700 pt-4">
          <button
            onClick={onReject}
            className="rounded-sm border border-ink-700 px-3.5 py-1.5 text-xs text-parchment-300 hover:bg-ink-800 hover:text-parchment-100 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onSign}
            className="rounded-sm bg-brass-500 px-4 py-1.5 text-xs font-semibold text-ink-950 hover:bg-brass-400 transition-colors shadow-sm"
          >
            Sign & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
