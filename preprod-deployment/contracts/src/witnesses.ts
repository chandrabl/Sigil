import { Ledger } from "./managed/bboard/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type AuctionPrivateState = {
  readonly secretKey?: Uint8Array;
};

export const createAuctionPrivateState = (secretKey?: Uint8Array) => ({
  secretKey: secretKey ?? new Uint8Array(32),
});

export const witnesses = {};
