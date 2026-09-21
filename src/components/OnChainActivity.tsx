import { useEffect, useState } from "react";
import {
  midnightWallet,
  type OnChainTxResult,
  explorerContractUrl,
  CONTRACT_ADDRESS,
} from "../lib/midnightWallet";

export function OnChainActivity({
  contractAddress,
}: {
  contractAddress?: string;
}) {
  const [txs, setTxs] = useState<OnChainTxResult[]>(() =>
    midnightWallet.getTxHistory()
  );

  useEffect(() => {
    return midnightWallet.subscribeTx((updated) => setTxs([...updated]));
  }, []);

  const activeContract = contractAddress || CONTRACT_ADDRESS;
  const contractUrl = explorerContractUrl();

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-5 space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-moss-400 animate-pulse" />
          <h3 className="font-display text-sm font-semibold tracking-wide text-parchment-100">
            Midnight Preprod · On-Chain Verifier
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-parchment-400 font-mono text-[11px]">
            Contract:
          </span>
          <a
            href={contractUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-brass-400 hover:text-brass-300 underline underline-offset-2 flex items-center gap-1"
          >
            {activeContract.slice(0, 10)}…{activeContract.slice(-8)} ↗
          </a>
        </div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-parchment-400">
          Recent On-Chain Transactions
        </div>

        {txs.length === 0 ? (
          <div className="rounded border border-ink-800 bg-ink-950/40 p-4 text-center text-xs text-parchment-400">
            No transactions yet this session. Connect a wallet and place a bid to
            generate verifiable on-chain transactions.
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.txId}
                className="rounded border border-ink-700 bg-ink-950/60 p-3 text-xs space-y-2"
              >
                {/* Action + timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-moss-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-moss-400 border border-moss-500/30">
                      ON-CHAIN
                    </span>
                    <span className="font-medium text-parchment-100">
                      {tx.action}
                    </span>
                    <span className="text-[10px] text-parchment-400">
                      ({tx.blockTimestamp})
                    </span>
                  </div>
                  <span className="rounded bg-brass-500/10 px-1.5 py-0.5 text-[10px] font-mono text-brass-400 border border-brass-500/20 shrink-0">
                    {tx.status}
                  </span>
                </div>

                {/* Tx hash */}
                <div className="font-mono text-[11px] text-parchment-400 break-all">
                  Tx: {tx.txId}
                </div>

                {/* Explorer links */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {tx.isRealTx && tx.explorerUrl ? (
                    <>
                      {/* Primary: 1AM Explorer */}
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-sm border border-brass-500/40 bg-brass-500/10 px-2.5 py-1 text-[11px] font-medium text-brass-300 hover:bg-brass-500/20 hover:text-brass-200 transition-colors"
                      >
                        ⚡ 1AM Explorer ↗
                      </a>

                      {/* Secondary: Midnight Block Explorer */}
                      {tx.midnightExplorerUrl && (
                        <a
                          href={tx.midnightExplorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm border border-ink-600 bg-ink-800/60 px-2.5 py-1 text-[11px] font-medium text-parchment-400 hover:bg-ink-800 hover:text-parchment-200 transition-colors"
                        >
                          🌙 Midnight Explorer ↗
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[11px] text-parchment-500">
                      🔒 Simulated — connect wallet with DUST for on-chain tx
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
