# Sigil

![CI](https://github.com/chandrabl/Sigil/actions/workflows/ci.yml/badge.svg)

> A private sealed-bid auction dApp on Midnight — commit your bid, let the ledger keep the secret, reveal only what the auction needs to know.

## Live Demo

[REPLACE WITH YOUR DEPLOYED FRONTEND URL]

## Deployed Contract (Midnight Preprod)

- **Contract Address:** [`0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507`](https://preprod.midnightexplorer.com/contracts/0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507)
- **Preprod Explorer:** [https://preprod.midnightexplorer.com/contracts/0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507](https://preprod.midnightexplorer.com/contracts/0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507)
- **DUST Generation Tx:** [`0x00bd94e452256079a92bf00cab0899481fd6c6574a3638715d1cf792d23459358e`](https://preprod.midnightexplorer.com/tx/0x00bd94e452256079a92bf00cab0899481fd6c6574a3638715d1cf792d23459358e)

| Network | Contract Address | Block Explorer |
| :--- | :--- | :--- |
| **Midnight Preprod** | `0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507` | [Open Contract on Midnight Explorer ↗](https://preprod.midnightexplorer.com/contracts/0x61ffd5679cc7a0c375514e82de007b6e502a5c1209ec7ceab157132d01838507) |


## What This Does

Sigil runs a single-lot sealed-bid auction in three enforced phases:

1. **Commit** — a bidder locks in `Poseidon(bidderId, amount, salt)` as a
   commitment. `amount` and `salt` are Compact witnesses — they exist only
   in the bidder's local proving context and are never sent to the chain.
2. **Reveal** — once the seller closes bidding, each bidder opens their own
   commitment by re-supplying `amount` and `salt`. The circuit recomputes
   the hash and checks it against the stored commitment before folding the
   amount into a running, privately-tracked maximum.
3. **Settle** — the seller closes the lot. The contract publishes the
   winning bidder and the winning amount. Every other bid that was ever
   placed — including every losing amount and every salt — is never
   written to the ledger and stays private permanently.

## Privacy Model

- **PUBLIC:** that a wallet placed a bid (commitment presence), the total
  number of bidders, the reserve price, the current phase, and — only
  after settlement — the winning bidder and winning amount.
- **PRIVATE:** every bid amount before its bidder chooses to reveal it,
  every salt at every phase, and every losing bid amount forever, even
  after settlement.
- **PROVED without revealing:** that a revealed amount matches the
  bidder's original commitment, and that the published winner really did
  submit the highest qualifying reveal — without the contract, the seller,
  or any observer ever seeing a losing amount.

## Privacy Claim

An on-chain observer watching this contract can see: how many people
bid, which wallets bid, when the lot moved between phases, and — once
settled — who won and for how much. They can never see: what anyone who
didn't win actually bid, how close the auction was, or any bidder's
salt, at any point in the contract's lifecycle. Two bidders who both
reveal cannot see each other's amounts either — the circuit compares
amounts internally and only ever writes the current leader's identity
and bid to the ledger.

## Tech Stack

- **Contract:** Compact (`contracts/auction.compact`) — commit/reveal
  sealed-bid logic with a Poseidon-style persistent hash commitment
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Wallet:** Lace (Midnight dApp connector API)
- **Tests:** Vitest, exercising a pure TypeScript mirror of the circuit
  logic (`src/lib/auctionLogic.ts`) so circuit behavior, state
  transitions, and the privacy guarantee are all covered without needing
  a live proof server in CI
- **CI/CD:** GitHub Actions — lint, type-check, test, and build on every
  push and pull request

## Prerequisites

- Node.js 22+
- The [Lace wallet](https://www.lace.io/) browser extension, configured
  for Midnight Preprod, for real wallet interaction
- The Compact compiler (`compactc`) to compile `contracts/auction.compact`
  — see [Midnight's docs](https://docs.midnight.network) for install
  instructions, since the exact install command varies by OS and release

## Setup & Run Locally

```bash
# 1. Install frontend dependencies
npm install

# 2. Compile the contract (requires compactc — see Prerequisites)
npm run compact:compile

# 3. Run the dev server
npm run dev
```

The frontend runs in **simulation mode** out of the box: `src/hooks/useAuction.ts`
drives the UI against `src/lib/auctionLogic.ts`, a pure TypeScript mirror of
the compiled contract's commit/reveal logic, so the full commit → reveal →
settle flow is fully interactive locally without needing a deployed
contract or a running proof server. Every mutation in that hook is marked
with the exact seam where it should be swapped for a call through the
generated Midnight contract client once you deploy to Preprod — the
component tree above it doesn't need to change.

## Run Tests

```bash
npm test
```

12 tests across three required categories: circuit logic (commitment
hashing is deterministic and tamper-evident), state transitions
(Commit → Reveal → Settled, leader tracking, access control), and privacy
(a losing bid's amount and salt never appear anywhere in the public view).

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request to `main`:
installs dependencies, attempts to compile the Compact contract, lints,
type-checks, runs the full test suite, and builds the production bundle.
The pipeline fails the build on any lint, type, test, or build error.

## Product Proposal

See [`PROPOSAL.md`](./PROPOSAL.md).
