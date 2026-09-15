import { SealMark } from "./SealMark";

export function ResultCard({
  winner,
  winningBid,
  lotName,
}: {
  winner: string;
  winningBid: bigint;
  lotName: string;
}) {
  return (
    <div className="relative overflow-hidden border border-brass-500/40 bg-ink-900/70 p-8 text-center">
      <div className="mx-auto flex w-fit items-center justify-center">
        <SealMark size={52} broken />
      </div>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-brass-500/70">
        Lot closed
      </p>
      <h2 className="mt-2 font-display text-3xl italic text-parchment-100">
        {lotName}
      </h2>
      <p className="mt-4 font-mono text-2xl text-brass-400">
        {winningBid.toLocaleString()} tDUST
      </p>
      <p className="mt-1 font-mono text-xs text-parchment-300/60">
        won by {winner.slice(0, 8)}…{winner.slice(-6)}
      </p>
      <p className="mx-auto mt-5 max-w-sm text-sm text-parchment-300/70">
        Every other bid ever placed on this lot stays private, permanently.
        This is the only amount the protocol ever needed to disclose.
      </p>
    </div>
  );
}
