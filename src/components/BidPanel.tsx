import { useState } from "react";
import { SealMark } from "./SealMark";
import type { MyBidRecord } from "../hooks/useAuction";

export function BidPanel({
  disabled,
  disabledReason,
  pending,
  myBid,
  onCommit,
}: {
  disabled: boolean;
  disabledReason: string | null;
  pending: boolean;
  myBid: MyBidRecord | null;
  onCommit: (amount: bigint) => Promise<unknown>;
}) {
  const [amountInput, setAmountInput] = useState("");

  if (myBid) {
    return (
      <div className="border border-brass-500/30 bg-ink-900/60 p-6">
        <div className="flex items-start gap-4">
          <SealMark size={36} />
          <div>
            <p className="font-display text-lg text-parchment-100">
              Your bid is sealed
            </p>
            <p className="mt-1 max-w-sm text-sm text-parchment-300/70">
              Sigil committed a hash of your amount to the ledger. The amount
              itself lives only in your browser session until you choose to
              reveal it in the next phase.
            </p>
            <p className="mt-3 font-mono text-xs text-parchment-300/50">
              amount held locally · salt held locally · nothing sent but a hash
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const amount = BigInt(amountInput || "0");
        if (amount <= 0n) return;
        await onCommit(amount);
      }}
      className="border border-ink-700 bg-ink-900/60 p-6"
    >
      <label
        htmlFor="bid-amount"
        className="font-display text-lg text-parchment-100"
      >
        Place a sealed bid
      </label>
      <p className="mt-1 text-sm text-parchment-300/70">
        Enter the most you're willing to pay. It stays private until you
        reveal it.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 items-center border border-ink-600 bg-ink-950 px-3 py-2.5 focus-within:border-brass-400">
          <input
            id="bid-amount"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="0"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={disabled || pending}
            className="w-full bg-transparent font-mono text-lg text-parchment-100 outline-none placeholder:text-parchment-300/30"
          />
          <span className="font-mono text-sm text-parchment-300/50">tDUST</span>
        </div>
        <button
          type="submit"
          disabled={disabled || pending || !amountInput}
          className="whitespace-nowrap border border-brass-500 bg-brass-500 px-5 py-2.5 font-display text-ink-950 transition-colors hover:bg-brass-400 disabled:cursor-not-allowed disabled:border-ink-600 disabled:bg-ink-700 disabled:text-parchment-300/40"
        >
          {pending ? "Sealing…" : "Seal bid"}
        </button>
      </div>

      {disabled && disabledReason && (
        <p className="mt-3 text-xs text-parchment-300/50">{disabledReason}</p>
      )}
    </form>
  );
}
