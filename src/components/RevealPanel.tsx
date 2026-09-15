import { SealMark } from "./SealMark";
import type { MyBidRecord } from "../hooks/useAuction";

export function RevealPanel({
  myBid,
  hasRevealed,
  pending,
  onReveal,
}: {
  myBid: MyBidRecord | null;
  hasRevealed: boolean;
  pending: boolean;
  onReveal: () => Promise<void>;
}) {
  if (!myBid) {
    return (
      <div className="border border-ink-700 bg-ink-900/60 p-6 text-sm text-parchment-300/60">
        You don't have a sealed bid from this session to reveal. If you bid
        from a different browser or session, nothing here will show it — by
        design, Sigil never stores your bid anywhere but your own device.
      </div>
    );
  }

  if (hasRevealed) {
    return (
      <div className="flex items-center gap-4 border border-moss-500/30 bg-ink-900/60 p-6">
        <SealMark size={36} broken />
        <div>
          <p className="font-display text-lg text-parchment-100">
            Bid opened — {myBid.amount.toLocaleString()} tDUST
          </p>
          <p className="mt-1 text-sm text-parchment-300/70">
            Your amount is now part of the running comparison. It only
            becomes permanently public if it turns out to be the winning bid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-brass-500/30 bg-ink-900/60 p-6">
      <p className="font-display text-lg text-parchment-100">
        Break your own seal
      </p>
      <p className="mt-1 max-w-md text-sm text-parchment-300/70">
        Reveal the amount and salt you committed with. Sigil checks it
        against your original commitment on-chain — if it matches, your bid
        enters the running comparison.
      </p>
      <button
        onClick={() => onReveal()}
        disabled={pending}
        className="mt-4 border border-brass-500 bg-brass-500 px-5 py-2.5 font-display text-ink-950 transition-colors hover:bg-brass-400 disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Reveal my bid"}
      </button>
    </div>
  );
}
