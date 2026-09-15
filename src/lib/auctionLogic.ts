/**
 * auctionLogic.ts
 *
 * A pure, dependency-light mirror of the commit/reveal arithmetic defined
 * in contracts/auction.compact. The real hash used on-chain is Compact's
 * `persistentHash`, run inside the zk circuit by the Midnight prover. This
 * module exists for two reasons:
 *
 *   1. The frontend needs to compute the *same* commitment client-side
 *      before it ever sends a transaction, so the wallet can show the
 *      bidder exactly what they're locking in.
 *   2. It gives us circuit-logic and state-transition tests we can run in
 *      plain Node/vitest without the Midnight proof server — see
 *      tests/auction.test.ts for how these map onto the three required
 *      test categories (circuit logic, state transitions, privacy).
 *
 * This file is NOT the source of truth for consensus — contracts/auction.compact
 * is. If you change one, change the other.
 */

export type Hex32 = string; // 64 hex chars, representing Bytes<32>

export interface Bid {
  bidderId: Hex32;
  amount: bigint;
  salt: Hex32;
}

export enum Phase {
  Commit = "Commit",
  Reveal = "Reveal",
  Settled = "Settled",
}

export interface AuctionState {
  phase: Phase;
  seller: Hex32;
  lotName: string;
  reservePrice: bigint;
  commitments: Map<Hex32, Hex32>;
  revealed: Set<Hex32>;
  currentLeader: Hex32 | null;
  currentHighBid: bigint;
  bidderCount: number;
  winner: Hex32 | null;
  winningBid: bigint | null;
}

const ZERO_ID: Hex32 = "0".repeat(64);

export function createAuction(
  seller: Hex32,
  lotName: string,
  reservePrice: bigint
): AuctionState {
  return {
    phase: Phase.Commit,
    seller,
    lotName,
    reservePrice,
    commitments: new Map(),
    revealed: new Set(),
    currentLeader: null,
    currentHighBid: 0n,
    bidderCount: 0,
    winner: null,
    winningBid: null,
  };
}

/**
 * Deterministic, synchronous stand-in for Compact's persistentHash over
 * [bidderId, amount, salt]. Uses the Web Crypto SubtleCrypto SHA-256
 * primitive so it runs identically in the browser and in Vitest (jsdom
 * ships webcrypto; Node >= 19 has it natively).
 */
export async function commitmentHash(
  bidderId: Hex32,
  amount: bigint,
  salt: Hex32
): Promise<Hex32> {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`${bidderId}:${amount.toString()}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSalt(): Hex32 {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class AuctionError extends Error {}

/** Mirrors circuit commitBid(). */
export async function commitBid(
  state: AuctionState,
  bid: Bid
): Promise<AuctionState> {
  if (state.phase !== Phase.Commit) {
    throw new AuctionError("auction is not accepting bids");
  }
  if (state.commitments.has(bid.bidderId)) {
    throw new AuctionError("bidder already committed");
  }
  const commitment = await commitmentHash(bid.bidderId, bid.amount, bid.salt);
  const next = cloneState(state);
  next.commitments.set(bid.bidderId, commitment);
  next.bidderCount += 1;
  return next;
}

/** Mirrors circuit openReveal(). */
export function openReveal(state: AuctionState, callerId: Hex32): AuctionState {
  if (state.phase !== Phase.Commit) {
    throw new AuctionError("auction is not in the commit phase");
  }
  if (callerId !== state.seller) {
    throw new AuctionError("only the seller can open the reveal phase");
  }
  if (state.bidderCount === 0) {
    throw new AuctionError("no bids were committed");
  }
  const next = cloneState(state);
  next.phase = Phase.Reveal;
  return next;
}

/** Mirrors circuit revealBid(). */
export async function revealBid(
  state: AuctionState,
  bid: Bid
): Promise<AuctionState> {
  if (state.phase !== Phase.Reveal) {
    throw new AuctionError("auction is not in the reveal phase");
  }
  const stored = state.commitments.get(bid.bidderId);
  if (!stored) {
    throw new AuctionError("no commitment on file for bidder");
  }
  if (state.revealed.has(bid.bidderId)) {
    throw new AuctionError("bidder already revealed");
  }
  const recomputed = await commitmentHash(bid.bidderId, bid.amount, bid.salt);
  if (recomputed !== stored) {
    throw new AuctionError("revealed amount does not match commitment");
  }
  if (bid.amount < state.reservePrice) {
    throw new AuctionError("bid below reserve");
  }

  const next = cloneState(state);
  next.revealed.add(bid.bidderId);
  if (bid.amount > next.currentHighBid) {
    next.currentHighBid = bid.amount;
    next.currentLeader = bid.bidderId;
  }
  return next;
}

/** Mirrors circuit settleAuction(). */
export function settleAuction(
  state: AuctionState,
  callerId: Hex32
): AuctionState {
  if (state.phase !== Phase.Reveal) {
    throw new AuctionError("auction already settled or not yet opened");
  }
  if (callerId !== state.seller) {
    throw new AuctionError("only the seller can settle the lot");
  }
  if (state.currentHighBid < state.reservePrice) {
    throw new AuctionError("no qualifying bid to settle");
  }
  const next = cloneState(state);
  next.winner = next.currentLeader ?? ZERO_ID;
  next.winningBid = next.currentHighBid;
  next.phase = Phase.Settled;
  return next;
}

/**
 * What an on-chain observer can reconstruct from ledger state alone —
 * used by the UI's privacy badge and by the privacy test. This function
 * only ever reads the public fields; it never has access to `Bid.amount`
 * or `Bid.salt` for non-winning bids, because those never existed in
 * AuctionState.commitments to begin with — only their hashes do.
 */
export function publicView(state: AuctionState) {
  return {
    phase: state.phase,
    lotName: state.lotName,
    reservePrice: state.reservePrice,
    participantCount: state.bidderCount,
    revealedCount: state.revealed.size,
    winner: state.winner,
    winningBid: state.winningBid,
    // Deliberately absent: every non-winning bid amount and every salt.
  };
}

function cloneState(state: AuctionState): AuctionState {
  return {
    ...state,
    commitments: new Map(state.commitments),
    revealed: new Set(state.revealed),
  };
}
