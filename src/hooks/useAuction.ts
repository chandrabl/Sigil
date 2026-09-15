import { useCallback, useMemo, useState } from "react";
import {
  createAuction,
  commitBid as commitBidLogic,
  openReveal as openRevealLogic,
  revealBid as revealBidLogic,
  settleAuction as settleAuctionLogic,
  randomSalt,
  Phase,
  type AuctionState,
  type Hex32,
} from "../lib/auctionLogic";
import { midnightWallet, type OnChainTxResult } from "../lib/midnightWallet";

const SEED_SELLER: Hex32 =
  "7a5f2c9e1b8d4306af7e2c1d9b6a4f803e5c7d1a2b9f6e4c8a0d3b7f1e5c2a94";

export interface MyBidRecord {
  amount: bigint;
  salt: Hex32;
}

export function useAuction(lotName: string, reservePrice: bigint) {
  const [state, setState] = useState<AuctionState>(() =>
    createAuction(SEED_SELLER, lotName, reservePrice)
  );
  const [myBid, setMyBid] = useState<MyBidRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<OnChainTxResult | null>(null);

  const commit = useCallback(
    async (bidderId: Hex32, amount: bigint) => {
      setPending(true);
      setLastError(null);
      try {
        const salt = randomSalt();
        const next = await commitBidLogic(state, { bidderId, amount, salt });
        const tx = await midnightWallet.signAndSubmitTx("Commit Sealed Bid", {
          action: "commitBid",
          bidderId,
          commitment: next.commitments.get(bidderId),
        });
        setLastTx(tx);
        setState(next);
        setMyBid({ amount, salt });
        return { amount, salt };
      } catch (err) {
        setLastError(err instanceof Error ? err.message : "Commit failed.");
        throw err;
      } finally {
        setPending(false);
      }
    },
    [state]
  );

  const openReveal = useCallback(
    async (sellerId: Hex32) => {
      setLastError(null);
      setPending(true);
      try {
        const next = openRevealLogic(state, sellerId);
        const tx = await midnightWallet.signAndSubmitTx("Open Reveal Phase", {
          action: "openReveal",
          sellerId,
        });
        setLastTx(tx);
        setState(next);
      } catch (err) {
        setLastError(
          err instanceof Error ? err.message : "Could not open reveal phase."
        );
      } finally {
        setPending(false);
      }
    },
    [state]
  );

  const reveal = useCallback(
    async (bidderId: Hex32) => {
      if (!myBid) {
        setLastError("No sealed bid found for this wallet in this session.");
        return;
      }
      setPending(true);
      setLastError(null);
      try {
        const next = await revealBidLogic(state, {
          bidderId,
          amount: myBid.amount,
          salt: myBid.salt,
        });
        const tx = await midnightWallet.signAndSubmitTx("Reveal Sealed Bid", {
          action: "revealBid",
          bidderId,
        });
        setLastTx(tx);
        setState(next);
      } catch (err) {
        setLastError(err instanceof Error ? err.message : "Reveal failed.");
        throw err;
      } finally {
        setPending(false);
      }
    },
    [state, myBid]
  );

  const settle = useCallback(
    async (sellerId: Hex32) => {
      setLastError(null);
      setPending(true);
      try {
        const next = settleAuctionLogic(state, sellerId);
        const tx = await midnightWallet.signAndSubmitTx("Settle Auction Lot", {
          action: "settleAuction",
          sellerId,
        });
        setLastTx(tx);
        setState(next);
      } catch (err) {
        setLastError(err instanceof Error ? err.message : "Settle failed.");
      } finally {
        setPending(false);
      }
    },
    [state]
  );

  const isSeller = useCallback(
    (id: Hex32 | null) => id !== null && id === state.seller,
    [state.seller]
  );

  const derived = useMemo(
    () => ({
      isCommitPhase: state.phase === Phase.Commit,
      isRevealPhase: state.phase === Phase.Reveal,
      isSettled: state.phase === Phase.Settled,
    }),
    [state.phase]
  );

  return {
    state,
    myBid,
    pending,
    lastError,
    lastTx,
    seller: SEED_SELLER,
    commit,
    openReveal,
    reveal,
    settle,
    isSeller,
    ...derived,
  };
}
