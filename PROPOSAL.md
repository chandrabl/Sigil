# Product Proposal

## What is the product, and who uses it?

Sigil is a sealed-bid auction protocol: sellers list a single lot, bidders
commit a hidden bid, and the contract determines a winner without ever
disclosing a losing bid amount — on-chain or off.

The people who need this today run auctions where bid amounts are
commercially sensitive: freelance/RFP procurement (a client shouldn't see
every vendor's price before deciding), private secondary-market sales
(collectibles, domain names, unlisted equity), and DAO or cooperative asset
sales where members don't want their bidding strategy visible to every
other member forever. A transparent auction leaks exactly the information
a bidder has the most reason to protect: how much they were willing to
pay and lose by.

## Why Midnight specifically?

A sealed-bid auction on a fully transparent chain isn't actually sealed —
every bid amount sits in calldata forever, readable by anyone, including
competitors who can use historical bids to game future auctions. Off-chain
sealed-bid systems (a centralized auction house collecting encrypted bids)
solve the visibility problem but reintroduce a trusted party who could
leak, front-run, or misreport bids.

Midnight lets the commitment/reveal logic run as a verifiable circuit:
the contract *proves* a revealed bid matches its earlier commitment and
*proves* the winner was chosen correctly, without any party — including
the contract deployer — ever holding or transmitting the losing amounts.
Compact's witness model is exactly the shape sealed-bid auctions need:
`amount` and `salt` exist only in the bidder's local proving context, and
the ledger only ever sees a commitment hash and, at the very end, one
winning number.

## Data Model

| Data Point                          | Type            | Disclosed To |
|--------------------------------------|-----------------|--------------|
| Bidder's commitment hash              | Public ledger   | Everyone |
| Bid amount (pre-reveal)               | Private witness | No one |
| Salt                                  | Private witness | No one, ever |
| Fact that wallet X bid on this lot    | Public ledger   | Everyone |
| Total number of bidders               | Public ledger   | Everyone |
| Reserve price                         | Public ledger   | Everyone |
| Current auction phase                 | Public ledger   | Everyone |
| Non-winning revealed amount           | Circuit-internal| No one — never written to the ledger |
| Winning bidder + winning amount       | Public ledger   | Everyone (only after settlement) |

## Mainnet Feasibility

Realistic. The contract is single-lot and stateless beyond one auction's
lifecycle, so it doesn't need the kind of cross-contract composition that
tends to be the hard part of a Mainnet launch. The main work between here
and Level 6 is: (1) a factory/registry contract so a seller can spin up a
new lot without redeploying, (2) replacing the seller-signature phase
transition with a verifiable time-boxed window once Midnight exposes
reliable on-chain time reads in this contract shape, and (3) a batched
settlement path for auctions with a very large number of bidders, so
reveal-phase gas doesn't scale awkwardly with participant count. None of
these are research problems — they're integration work.
