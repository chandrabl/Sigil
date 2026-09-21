import type { DiscoveredWallet, WalletId } from "../hooks/useLaceWallet";

interface WalletConnectModalProps {
  isOpen: boolean;
  wallets: DiscoveredWallet[];
  onSelectWallet: (id: WalletId) => void;
  onCancel: () => void;
}

const INSTALL_LINKS: Record<string, string> = {
  "1am": "https://1am.xyz",
  lace: "https://www.lace.io",
};

/**
 * Full-screen wallet chooser modal.
 *
 * Shows all discovered wallets (1AM, Lace, others).
 * Installed wallets → clickable to connect (triggers wallet extension popup).
 * Uninstalled wallets → shows install link.
 */
export function WalletConnectModal({
  isOpen,
  wallets,
  onSelectWallet,
  onCancel,
}: WalletConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-brass-500/40 bg-ink-900/98 shadow-2xl shadow-brass-950/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rotate-45 bg-brass-400" />
            <h2 className="font-display text-sm font-semibold text-parchment-100">
              Connect a Midnight Wallet
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-sm p-1 text-parchment-400 hover:text-parchment-100 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Network badge */}
        <div className="px-5 pt-3 pb-1">
          <span className="inline-flex items-center gap-1.5 rounded border border-brass-500/30 bg-brass-500/8 px-2 py-0.5 font-mono text-[10px] text-brass-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brass-400 animate-pulse" />
            Midnight Preprod
          </span>
        </div>

        {/* Wallet list */}
        <div className="px-4 py-3 space-y-2">
          {wallets.map((wallet) =>
            wallet.installed ? (
              <button
                key={wallet.id}
                id={`wallet-option-${wallet.id}`}
                onClick={() => onSelectWallet(wallet.id)}
                className="group flex w-full items-center gap-3 rounded-md border border-ink-700 bg-ink-800/60 px-4 py-3 text-left transition-all hover:border-brass-500/50 hover:bg-ink-800 focus:outline-none focus:ring-1 focus:ring-brass-500/50"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-ink-600 bg-ink-900">
                  {wallet.icon ? (
                    <img
                      src={wallet.icon}
                      alt={wallet.name}
                      className="h-6 w-6 rounded"
                    />
                  ) : (
                    <span className="text-lg">
                      {wallet.id === "1am"
                        ? "⚡"
                        : wallet.id === "lace"
                        ? "🔷"
                        : "🌙"}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-sm font-medium text-parchment-100 group-hover:text-white">
                    {wallet.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-parchment-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-moss-400" />
                    Detected · Preprod ready
                  </div>
                </div>

                <svg
                  className="h-4 w-4 text-parchment-500 group-hover:text-brass-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ) : (
              <div
                key={wallet.id}
                className="flex w-full items-center gap-3 rounded-md border border-ink-800 bg-ink-900/40 px-4 py-3 opacity-60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-ink-700 bg-ink-900">
                  <span className="text-lg">
                    {wallet.id === "1am"
                      ? "⚡"
                      : wallet.id === "lace"
                      ? "🔷"
                      : "🌙"}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-parchment-300">
                    {wallet.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-parchment-500">
                    Not detected
                  </div>
                </div>
                {INSTALL_LINKS[wallet.id] && (
                  <a
                    href={INSTALL_LINKS[wallet.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-sm border border-ink-600 bg-ink-800 px-2.5 py-1 text-[11px] text-parchment-300 hover:border-brass-500/40 hover:text-parchment-100 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install ↗
                  </a>
                )}
              </div>
            )
          )}

          {wallets.every((w) => !w.installed) && (
            <p className="rounded border border-ink-700 bg-ink-950/60 p-3 text-center text-xs text-parchment-400">
              No Midnight wallet detected. Install the{" "}
              <a
                href="https://1am.xyz"
                target="_blank"
                rel="noreferrer"
                className="text-brass-400 underline hover:text-brass-300"
              >
                1AM Wallet
              </a>{" "}
              or{" "}
              <a
                href="https://www.lace.io"
                target="_blank"
                rel="noreferrer"
                className="text-brass-400 underline hover:text-brass-300"
              >
                Lace
              </a>{" "}
              extension and configure it for Midnight Preprod.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-5 py-3">
          <p className="text-[10px] text-parchment-500">
            Connecting will open your wallet extension to approve this site.
            Your bid amounts and salt remain private.
          </p>
        </div>
      </div>
    </div>
  );
}
