export function SellerControls({
  phase,
  bidderCount,
  onOpenReveal,
  onSettle,
}: {
  phase: "Commit" | "Reveal" | "Settled";
  bidderCount: number;
  onOpenReveal: () => void;
  onSettle: () => void;
}) {
  return (
    <div className="border border-dashed border-brass-500/30 bg-brass-500/5 p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-brass-500/70">
        Seller controls
      </p>
      <p className="mt-1 text-sm text-parchment-300/70">
        You deployed this lot, so only your wallet can advance it.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={onOpenReveal}
          disabled={phase !== "Commit" || bidderCount === 0}
          className="border border-ink-600 px-4 py-2 text-sm text-parchment-100 transition-colors hover:border-brass-400 hover:text-brass-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Close bidding, open reveal
        </button>
        <button
          onClick={onSettle}
          disabled={phase !== "Reveal"}
          className="border border-ink-600 px-4 py-2 text-sm text-parchment-100 transition-colors hover:border-brass-400 hover:text-brass-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Settle the lot
        </button>
      </div>
    </div>
  );
}
