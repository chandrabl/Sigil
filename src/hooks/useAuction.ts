import { useCallback, useEffect, useMemo, useState } from "react";
import { getContractClient, getLastSubmittedTxId, resetLastSubmittedTxId } from "../lib/onchain";
import { type Hex32, Phase } from "../lib/auctionLogic";
import { useLaceWallet } from "./useLaceWallet";
import { Buffer } from "buffer";

export interface MyBidRecord {
  amount: bigint;
  salt: Hex32;
}

export function useAuction(lotName: string, reservePrice: bigint) {
  const { api } = useLaceWallet();
  const [client, setClient] = useState<any>(null);
  const [state, setState] = useState({
    lotName,
    reservePrice,
    phase: Phase.Commit,
    seller: "7a5f2c9e1b8d4306af7e2c1d9b6a4f803e5c7d1a2b9f6e4c8a0d3b7f1e5c2a94",
    commitments: new Map<string, string>(),
    revealed: new Set<string>(),
    currentLeader: "",
    currentHighBid: 0n,
    winner: "",
    winningBid: 0n,
    bidderCount: 0n,
  });
  const [myBid, setMyBid] = useState<MyBidRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; txHash: string; label: string } | null>(null);

  useEffect(() => {
    if (!api) return;
    let unmounted = false;
    getContractClient(api).then((c) => {
      if (!unmounted) setClient(c);
    }).catch(console.error);
    return () => { unmounted = true; };
  }, [api]);

  const randomSalt = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Buffer.from(array).toString("hex") as Hex32;
  };

  const executeTx = async (label: string, callFn: () => Promise<any>) => {
    if (!client) throw new Error("Midnight SDK is not initialized yet.");
    setPending(true);
    setLastError(null);
    resetLastSubmittedTxId();
    try {
      const callPromise = callFn();
      const earlyReturnPromise = new Promise<{ early: true }>((resolve) => {
        const check = setInterval(() => {
          if (getLastSubmittedTxId()) {
            clearInterval(check);
            setTimeout(() => resolve({ early: true }), 1500);
          }
        }, 300);
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("On-chain verification timed out.")), 60000)
      );
      
      const tx: any = await Promise.race([callPromise, earlyReturnPromise, timeoutPromise]);
      
      const submittedId = getLastSubmittedTxId();
      const rawTxHash = submittedId || tx?.public?.txHash || tx?.public?.txId || tx?.txHash || tx;
      const cleanTxHash = String(rawTxHash || "").replace(/^0x/, "");
      
      setLastTx({ hash: cleanTxHash, txHash: cleanTxHash, label });
      return tx;
    } catch (err) {
      setLastError(err instanceof Error ? err.message : `${label} failed.`);
      throw err;
    } finally {
      setPending(false);
    }
  };

  const commit = useCallback(
    async (bidderId: Hex32, amount: bigint) => {
      const salt = randomSalt();
      const bidderIdBytes = new Uint8Array(Buffer.from(bidderId, "hex"));
      const saltBytes = new Uint8Array(Buffer.from(salt, "hex"));
      
      await executeTx("Commit Sealed Bid", () => 
        client.callTx.commitBid(bidderIdBytes, amount, saltBytes)
      );

      setMyBid({ amount, salt });
      setState((prev) => {
        const next = { ...prev };
        next.commitments.set(bidderId, "committed");
        next.bidderCount = next.bidderCount + 1n;
        return next;
      });

      return { amount, salt };
    },
    [client]
  );

  const openReveal = useCallback(
    async (sellerId: Hex32) => {
      const sellerIdBytes = new Uint8Array(Buffer.from(sellerId, "hex"));
      await executeTx("Open Reveal Phase", () => 
        client.callTx.openReveal(sellerIdBytes)
      );
      setState((prev) => ({ ...prev, phase: Phase.Reveal }));
    },
    [client]
  );

  const reveal = useCallback(
    async (bidderId: Hex32) => {
      if (!myBid) {
        setLastError("No sealed bid found for this wallet in this session.");
        return;
      }
      const bidderIdBytes = new Uint8Array(Buffer.from(bidderId, "hex"));
      const saltBytes = new Uint8Array(Buffer.from(myBid.salt, "hex"));
      
      await executeTx("Reveal Sealed Bid", () => 
        client.callTx.revealBid(bidderIdBytes, myBid.amount, saltBytes)
      );

      setState((prev) => {
        const next = { ...prev };
        next.revealed.add(bidderId);
        if (myBid.amount > next.currentHighBid) {
          next.currentHighBid = myBid.amount;
          next.currentLeader = bidderId;
        }
        return next;
      });
    },
    [client, myBid]
  );

  const settle = useCallback(
    async (sellerId: Hex32) => {
      const sellerIdBytes = new Uint8Array(Buffer.from(sellerId, "hex"));
      await executeTx("Settle Auction Lot", () => 
        client.callTx.settleAuction(sellerIdBytes)
      );

      setState((prev) => {
        return {
          ...prev,
          phase: Phase.Settled,
          winner: prev.currentLeader,
          winningBid: prev.currentHighBid,
        };
      });
    },
    [client]
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
    seller: state.seller,
    commit,
    openReveal,
    reveal,
    settle,
    isSeller,
    ...derived,
  };
}
