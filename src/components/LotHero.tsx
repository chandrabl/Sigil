import { Phase } from "../lib/auctionLogic";
import { SealMark } from "./SealMark";

export function LotHero({
  lotName,
  reservePrice,
  phase,
  participantCount,
}: {
  lotName: string;
  reservePrice: bigint;
  phase: Phase;
  participantCount: number;
}) {
  return (
    <div className="relative overflow-hidden border-b border-ink-700 pb-10 pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grain"
      />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-500/70">
        Lot 001
      </p>
      <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl italic leading-tight text-parchment-100 md:text-5xl">
            {lotName}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-parchment-300/80">
            Every bid is sealed the moment it's placed. No one — not the
            seller, not other bidders, not an observer reading the chain —
            can see an amount until the bidder who made it chooses to reveal
            it.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-sm border border-ink-700 bg-ink-900/60 px-5 py-4">
          <SealMark size={44} broken={phase === Phase.Settled} />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-parchment-300/60">
              Reserve
            </p>
            <p className="font-display text-xl text-parchment-100">
              {reservePrice.toLocaleString()} tDUST
            </p>
            <p className="mt-1 text-xs text-parchment-300/60">
              {participantCount} sealed {participantCount === 1 ? "bid" : "bids"} so far
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
