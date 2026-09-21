import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Phase { Commit = 0, Reveal = 1, Settled = 2 }

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  commitBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settleAuction(context: __compactRuntime.CircuitContext<PS>,
                callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  openReveal(context: __compactRuntime.CircuitContext<PS>,
             callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  commitBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settleAuction(context: __compactRuntime.CircuitContext<PS>,
                callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  openReveal(context: __compactRuntime.CircuitContext<PS>,
             callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  commitBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealBid(context: __compactRuntime.CircuitContext<PS>,
            bidderId_0: Uint8Array,
            amount_0: bigint,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settleAuction(context: __compactRuntime.CircuitContext<PS>,
                callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  openReveal(context: __compactRuntime.CircuitContext<PS>,
             callerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly phase: Phase;
  readonly seller: Uint8Array;
  readonly lotName: string;
  readonly reservePrice: bigint;
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  revealed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly currentLeader: Uint8Array;
  readonly currentHighBid: bigint;
  readonly bidderCount: bigint;
  readonly hasBids: boolean;
  readonly winner: Uint8Array;
  readonly winningBid: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               sellerId_0: Uint8Array,
               lot_0: string,
               reserve_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
