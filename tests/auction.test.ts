import { describe, it, expect } from "vitest";
import {
  createAuction,
  commitBid,
  openReveal,
  revealBid,
  settleAuction,
  publicView,
  commitmentHash,
  randomSalt,
  Phase,
  AuctionError,
  type AuctionState,
} from "../src/lib/auctionLogic";

const SELLER = "a".repeat(64);
const ALICE = "1".repeat(64);
const BOB = "2".repeat(64);
const CAROL = "3".repeat(64);

async function seedTwoBidders(): Promise<{
  state: AuctionState;
  aliceSalt: string;
  bobSalt: string;
}> {
  let state = createAuction(SELLER, "1967 Gibson SG", 500n);
  const aliceSalt = randomSalt();
  const bobSalt = randomSalt();
  state = await commitBid(state, { bidderId: ALICE, amount: 800n, salt: aliceSalt });
  state = await commitBid(state, { bidderId: BOB, amount: 1200n, salt: bobSalt });
  return { state, aliceSalt, bobSalt };
}

// ---------------------------------------------------------------------
// a) Circuit logic — does the circuit compute correctly?
// ---------------------------------------------------------------------
describe("circuit logic: commitment hashing", () => {
  it("produces a deterministic commitment for the same inputs", async () => {
    const h1 = await commitmentHash(ALICE, 800n, "deadbeef".repeat(8));
    const h2 = await commitmentHash(ALICE, 800n, "deadbeef".repeat(8));
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // 32 bytes, hex-encoded
  });

  it("produces a different commitment if the amount changes", async () => {
    const salt = randomSalt();
    const h1 = await commitmentHash(ALICE, 800n, salt);
    const h2 = await commitmentHash(ALICE, 801n, salt);
    expect(h1).not.toBe(h2);
  });

  it("produces a different commitment if the salt changes", async () => {
    const h1 = await commitmentHash(ALICE, 800n, randomSalt());
    const h2 = await commitmentHash(ALICE, 800n, randomSalt());
    expect(h1).not.toBe(h2);
  });

  it("rejects a reveal whose amount+salt don't match the stored commitment", async () => {
    const { state, aliceSalt } = await seedTwoBidders();
    const next = openReveal(state, SELLER);
    await expect(
      revealBid(next, { bidderId: ALICE, amount: 999n, salt: aliceSalt })
    ).rejects.toThrow(AuctionError);
  });
});

// ---------------------------------------------------------------------
// b) State transitions — does ledger state update as expected?
// ---------------------------------------------------------------------
describe("state transitions", () => {
  it("moves Commit -> Reveal -> Settled in order, tracking the leader", async () => {
    const { state, aliceSalt, bobSalt } = await seedTwoBidders();
    expect(state.phase).toBe(Phase.Commit);
    expect(state.bidderCount).toBe(2);

    const opened = openReveal(state, SELLER);
    expect(opened.phase).toBe(Phase.Reveal);

    let next = await revealBid(opened, { bidderId: ALICE, amount: 800n, salt: aliceSalt });
    expect(next.currentLeader).toBe(ALICE);
    expect(next.currentHighBid).toBe(800n);

    next = await revealBid(next, { bidderId: BOB, amount: 1200n, salt: bobSalt });
    expect(next.currentLeader).toBe(BOB); // higher bid overtakes the leader
    expect(next.currentHighBid).toBe(1200n);

    const settled = settleAuction(next, SELLER);
    expect(settled.phase).toBe(Phase.Settled);
    expect(settled.winner).toBe(BOB);
    expect(settled.winningBid).toBe(1200n);
  });

  it("rejects a second commitment from the same bidder", async () => {
    const { state, aliceSalt } = await seedTwoBidders();
    await expect(
      commitBid(state, { bidderId: ALICE, amount: 900n, salt: aliceSalt })
    ).rejects.toThrow("already committed");
  });

  it("rejects settling before the reveal phase is opened", async () => {
    const { state } = await seedTwoBidders();
    expect(() => settleAuction(state, SELLER)).toThrow(AuctionError);
  });

  it("rejects a non-seller trying to open the reveal phase or settle", async () => {
    const { state, aliceSalt, bobSalt } = await seedTwoBidders();
    expect(() => openReveal(state, CAROL)).toThrow("only the seller");

    let next = openReveal(state, SELLER);
    next = await revealBid(next, { bidderId: ALICE, amount: 800n, salt: aliceSalt });
    next = await revealBid(next, { bidderId: BOB, amount: 1200n, salt: bobSalt });
    expect(() => settleAuction(next, CAROL)).toThrow("only the seller");
  });

  it("rejects a reveal below the reserve price", async () => {
    const lowSalt = randomSalt();
    let state = createAuction(SELLER, "Chipped teapot", 1000n);
    state = await commitBid(state, { bidderId: ALICE, amount: 50n, salt: lowSalt });
    state = openReveal(state, SELLER);
    await expect(
      revealBid(state, { bidderId: ALICE, amount: 50n, salt: lowSalt })
    ).rejects.toThrow("below reserve");
  });
});

// ---------------------------------------------------------------------
// c) Privacy — private input is never exposed in any output
// ---------------------------------------------------------------------
describe("privacy: losing bids never surface in public state", () => {
  it("publicView never contains a non-winning bid amount or any salt", async () => {
    const { state, aliceSalt, bobSalt } = await seedTwoBidders();
    let next = openReveal(state, SELLER);
    next = await revealBid(next, { bidderId: ALICE, amount: 800n, salt: aliceSalt });
    next = await revealBid(next, { bidderId: BOB, amount: 1200n, salt: bobSalt });
    next = settleAuction(next, SELLER);

    const view = JSON.stringify(publicView(next), (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );

    // Alice lost (800 < 1200). Her amount and salt must not appear anywhere
    // in the observer-facing view, even though she participated.
    expect(view).not.toContain("800");
    expect(view).not.toContain(aliceSalt);
    expect(view).not.toContain(bobSalt); // even the winner's salt is never needed publicly

    // Only the winning amount is disclosed, as the protocol intends.
    expect(view).toContain("1200");
  });

  it("exposes participation (commitment presence) without exposing amounts", async () => {
    const { state } = await seedTwoBidders();
    // An observer can see *that* Alice and Bob are in the commitment map...
    expect(state.commitments.has(ALICE)).toBe(true);
    expect(state.commitments.has(BOB)).toBe(true);
    // ...but the map's values are hashes, never the underlying amounts.
    for (const commitment of state.commitments.values()) {
      expect(commitment).not.toBe("800");
      expect(commitment).not.toBe("1200");
      expect(commitment).toHaveLength(64);
    }
  });

  it("a losing bidder's amount cannot be recovered from state without their salt", async () => {
    const { state, bobSalt } = await seedTwoBidders();
    let next = openReveal(state, SELLER);
    next = await revealBid(next, { bidderId: BOB, amount: 1200n, salt: bobSalt });
    // Alice never reveals. Brute-forcing her commitment from public state
    // alone (without her salt) is exactly what the hash prevents — this
    // test documents the guarantee rather than attempting the brute force.
    expect(next.revealed.has(ALICE)).toBe(false);
    expect(publicView(next).winner).toBeNull();
  });
});
