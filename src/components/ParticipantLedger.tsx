import type { AuctionState } from "../lib/auctionLogic";
import { Phase } from "../lib/auctionLogic";

function short(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function ParticipantLedger({ state }: { state: AuctionState }) {
  const ids = Array.from(state.commitments.keys());

  return (
    <div className="border border-ink-700 bg-ink-900/40">
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
        <p className="font-display text-base text-parchment-100">
          What the ledger actually shows
        </p>
        <span className="font-mono text-xs text-parchment-300/50">
          {ids.length} entries
        </span>
      </div>
      <ul className="divide-y divide-ink-700/70">
        {ids.length === 0 && (
          <li className="px-5 py-6 text-sm text-parchment-300/50">
            No bids sealed yet — this lot's ledger will fill in as bidders
            commit.
          </li>
        )}
        {ids.map((id) => {
          const isWinner = state.winner === id;
          const hasRevealed = state.revealed.has(id);
          return (
            <li
              key={id}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <span className="font-mono text-parchment-300/80">
                {short(id)}
              </span>
              <span className="flex items-center gap-3">
                {isWinner && state.phase === Phase.Settled ? (
                  <span className="font-mono text-brass-400">
                    {state.winningBid?.toLocaleString()} tDUST — winner
                  </span>
                ) : hasRevealed ? (
                  <span className="font-mono text-parchment-300/50">
                    revealed · amount withheld
                  </span>
                ) : (
                  <span className="font-mono text-parchment-300/40">
                    sealed
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
