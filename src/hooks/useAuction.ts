import { useCallback, useEffect, useMemo, useState } from "react";
import { getContractClient, getLastSubmittedTxId, resetLastSubmittedTxId } from "../lib/onchain";
import { type Hex32, Phase } from "../lib/auctionLogic";
import { useLaceWallet } from "./useLaceWallet";
import { toHex } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export interface MyBidRecord {
  amount: bigint;
  salt: Hex32;
}

export function useAuction(lotName: string, reservePrice: bigint) {
  const { api } = useLaceWallet();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    bidderCount: 0,
  });
  const [myBid, setMyBid] = useState<MyBidRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ hash: string; txHash: string; label: string } | null>(null);

  useEffect(() => {
    if (!api || !api.provider) return;
    let unmounted = false;
    getContractClient(api.provider).then((c) => {
      if (!unmounted) setClient(c);
    }).catch((e) => {
      console.error("GET_CONTRACT_CLIENT_ERROR", e);
      alert("SDK Initialization Error: " + e.message);
    });
    return () => { unmounted = true; };
  }, [api]);

  const randomSalt = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return toHex(array) as Hex32;
  };

  /**
   * Converts any hex string (wallet address, coinPublicKey, etc.) to a
   * deterministic 32-byte Uint8Array suitable for Compact Bytes<32> params.
   * Uses SHA-256 to ensure exactly 32 bytes regardless of input length.
   */
  const toBytes32 = async (hexOrStr: string): Promise<Uint8Array> => {
    // Strip 0x prefix if present
    const clean = hexOrStr.replace(/^0x/, "");
    // If it's exactly 64 hex chars (32 bytes), decode directly
    if (/^[0-9a-fA-F]{64}$/.test(clean)) {
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    }
    // Otherwise SHA-256 hash it to get a stable 32-byte value
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(hexOrStr)
    );
    return new Uint8Array(buf);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeTx = useCallback(async (label: string, callFn: () => Promise<any>) => {
    if (!api) {
      alert("Please connect your Midnight wallet first!");
      throw new Error("Wallet not connected.");
    }
    if (!client) {
      alert("SDK is not initialized. Please check if there were initialization errors, or wait a moment.");
      throw new Error("Midnight SDK is not initialized yet.");
    }
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [client, api]);

  const commit = useCallback(
    async (bidderId: Hex32, amount: bigint) => {
      const salt = randomSalt();
      const bidderIdBytes = await toBytes32(bidderId);
      const saltBytes = await toBytes32(salt);

      await executeTx("Commit Sealed Bid", () =>
        client.callTx.commitBid(bidderIdBytes, amount, saltBytes)
      );

      setMyBid({ amount, salt });
      setState((prev) => {
        const next = { ...prev };
        next.commitments.set(bidderId, "committed");
        next.bidderCount = next.bidderCount + 1;
        return next;
      });

      return { amount, salt };
    },
    [client, executeTx]
  );

  const openReveal = useCallback(
    async (sellerId: Hex32) => {
      const sellerIdBytes = await toBytes32(sellerId);
      await executeTx("Open Reveal Phase", () =>
        client.callTx.openReveal(sellerIdBytes)
      );
      setState((prev) => ({ ...prev, phase: Phase.Reveal }));
    },
    [client, executeTx]
  );

  const reveal = useCallback(
    async (bidderId: Hex32) => {
      if (!myBid) {
        setLastError("No sealed bid found for this wallet in this session.");
        return;
      }
      const bidderIdBytes = await toBytes32(bidderId);
      const saltBytes = await toBytes32(myBid.salt);

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
    [client, myBid, executeTx]
  );

  const settle = useCallback(
    async (sellerId: Hex32) => {
      const sellerIdBytes = await toBytes32(sellerId);
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
    [client, executeTx]
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
