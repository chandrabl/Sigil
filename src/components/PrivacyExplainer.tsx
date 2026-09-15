export function PrivacyExplainer() {
  return (
    <div className="border-t border-ink-700 py-10">
      <p className="font-display text-xl text-parchment-100">
        What can an observer actually learn?
      </p>
      <div className="mt-5 grid gap-px overflow-hidden border border-ink-700 bg-ink-700 md:grid-cols-2">
        <div className="bg-ink-950 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-moss-400">
            Visible on-chain
          </p>
          <ul className="mt-3 space-y-2 text-sm text-parchment-300/80">
            <li>That a given wallet placed a bid on this lot</li>
            <li>How many bids were sealed in total</li>
            <li>The auction's current phase</li>
            <li>The winning bidder and the winning amount, after settlement</li>
          </ul>
        </div>
        <div className="bg-ink-950 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-seal-500">
            Never visible on-chain
          </p>
          <ul className="mt-3 space-y-2 text-sm text-parchment-300/80">
            <li>Any losing bid amount, ever, at any phase</li>
            <li>The salt any bidder used to seal their commitment</li>
            <li>Relative ranking of losing bids to one another</li>
            <li>A bidder's amount before they choose to reveal it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
