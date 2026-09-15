import { useEffect, useState } from "react";
import { WalletConnect } from "./components/WalletConnect";
import { LotHero } from "./components/LotHero";
import { PhaseRail } from "./components/PhaseRail";
import { BidPanel } from "./components/BidPanel";
import { RevealPanel } from "./components/RevealPanel";
import { ParticipantLedger } from "./components/ParticipantLedger";
import { ResultCard } from "./components/ResultCard";
import { PrivacyExplainer } from "./components/PrivacyExplainer";
import { StatusBanner } from "./components/StatusBanner";
import { SellerControls } from "./components/SellerControls";
import { OnChainActivity } from "./components/OnChainActivity";
import { deriveBidderId } from "./hooks/useWallet";
import { useAuction } from "./hooks/useAuction";

export const CONTRACT_ADDRESS = "0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507";
const LOT_NAME = "1967 Gibson SG — Cherry Red, Original Case";
const RESERVE = 500n;

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [bidderId, setBidderId] = useState<string | null>(null);

  const auction = useAuction(LOT_NAME, RESERVE);

  useEffect(() => {
    if (!walletAddress) {
      setBidderId(null);
      return;
    }
    let cancelled = false;
    deriveBidderId(walletAddress).then((id) => {
      if (!cancelled) setBidderId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const iAmSeller = auction.isSeller(bidderId);
  const hasRevealed = bidderId ? auction.state.revealed.has(bidderId) : false;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rotate-45 bg-brass-500" />
          <span className="font-display text-lg tracking-wide text-parchment-100">
            Sigil
          </span>
        </div>
        <WalletConnect onAddress={setWalletAddress} />
      </header>

      <LotHero
        lotName={LOT_NAME}
        reservePrice={RESERVE}
        phase={auction.state.phase}
        participantCount={auction.state.bidderCount}
      />

      <div className="py-8">
        <PhaseRail current={auction.state.phase} />
      </div>

      {auction.lastTx && (
        <div className="pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-moss-500/40 bg-moss-500/10 p-3 text-xs text-moss-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-moss-400 animate-pulse" />
              <span>
                <strong>{auction.lastTx.action}</strong> submitted successfully to Midnight Preprod!
              </span>
            </div>
            <a
              href={auction.lastTx.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center font-medium underline underline-offset-2 text-moss-200 hover:text-white"
            >
              Verify on Midnight Block Explorer ↗
            </a>
          </div>
        </div>
      )}

      {auction.lastError && (
        <div className="pb-6">
          <StatusBanner tone="error">{auction.lastError}</StatusBanner>
        </div>
      )}

      {!bidderId && (
        <div className="pb-6">
          <StatusBanner tone="info">
            Connect a Midnight wallet (Lace or 1AM) to seal a bid. You will be prompted for an interactive signature authorization popup to authenticate on-chain.
          </StatusBanner>
        </div>
      )}

      <div className="space-y-6 pb-10">
        {auction.isCommitPhase && bidderId && (
          <BidPanel
            disabled={!bidderId}
            disabledReason={null}
            pending={auction.pending}
            myBid={auction.myBid}
            onCommit={(amount) => auction.commit(bidderId, amount)}
          />
        )}

        {auction.isRevealPhase && bidderId && (
          <RevealPanel
            myBid={auction.myBid}
            hasRevealed={hasRevealed}
            pending={auction.pending}
            onReveal={() => auction.reveal(bidderId)}
          />
        )}

        {auction.isSettled &&
          auction.state.winner &&
          auction.state.winningBid !== null && (
            <ResultCard
              lotName={LOT_NAME}
              winner={auction.state.winner}
              winningBid={auction.state.winningBid}
            />
          )}

        {iAmSeller && !auction.isSettled && (
          <SellerControls
            phase={
              auction.isCommitPhase
                ? "Commit"
                : auction.isRevealPhase
                  ? "Reveal"
                  : "Settled"
            }
            bidderCount={auction.state.bidderCount}
            onOpenReveal={() => auction.openReveal(auction.seller)}
            onSettle={() => auction.settle(auction.seller)}
          />
        )}

        <ParticipantLedger state={auction.state} />

        <OnChainActivity contractAddress={CONTRACT_ADDRESS} />
      </div>

      <PrivacyExplainer />

      <footer className="flex items-center justify-between border-t border-ink-700 py-8 text-xs text-parchment-300/50">
        <span>Sigil · Midnight Builder Challenge, Level 3</span>
        <span className="font-mono">{auction.state.phase}</span>
      </footer>
    </div>
  );
}
