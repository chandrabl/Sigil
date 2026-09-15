import { useEffect, useState } from "react";
import { midnightWallet, type OnChainTxResult } from "../lib/midnightWallet";

export function OnChainActivity({ contractAddress }: { contractAddress?: string }) {
  const [txs, setTxs] = useState<OnChainTxResult[]>(() => midnightWallet.getTxHistory());

  useEffect(() => {
    return midnightWallet.subscribeTx((updated) => setTxs([...updated]));
  }, []);

  const activeContract =
    contractAddress ||
    "0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507";

  const contractUrl = `https://preprod.midnightexplorer.com/contracts/${
    activeContract.startsWith("0x") ? activeContract : "0x" + activeContract
  }`;

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-moss-400 animate-pulse" />
          <h3 className="font-display text-sm font-semibold tracking-wide text-parchment-100">
            Midnight Preprod On-Chain Verifier
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-parchment-400 font-mono text-[11px]">Contract:</span>
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

      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-parchment-400">
          Recent On-Chain Activity & Verifiable Proofs
        </div>

        {txs.length === 0 ? (
          <div className="rounded border border-ink-800 bg-ink-950/40 p-4 text-center text-xs text-parchment-400">
            No transactions submitted in this session yet. Connect wallet and place a bid or advance phases to generate verifiable on-chain transactions.
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.txId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-ink-700 bg-ink-950/60 p-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-moss-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-moss-400 border border-moss-500/30">
                      ON-CHAIN
                    </span>
                    <span className="font-medium text-parchment-100">{tx.action}</span>
                    <span className="text-[10px] text-parchment-400">({tx.blockTimestamp})</span>
                  </div>
                  <div className="font-mono text-[11px] text-parchment-400 break-all">
                    Tx ID: {tx.txId}
                  </div>
                </div>

                <a
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-brass-500/15 border border-brass-500/30 px-3 py-1.5 text-[11px] font-medium text-brass-300 hover:bg-brass-500/25 hover:text-brass-200 transition-colors shrink-0"
                >
                  Verify on Explorer ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
