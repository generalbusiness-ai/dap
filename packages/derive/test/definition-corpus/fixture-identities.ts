/** Deterministic byte-association fixtures, never accepted Native birth or authority. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, GenesisEntry, MemberId, MemberRef, ScopeKind, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, entryHash, newGenesisNonce, scopeIdOf } from "@generalbusiness/dap-bytes";
import { rememberSequence } from "./fixture-sequences.ts";
export const d = (c: string): Digest => `sha256:${c.repeat(64)}`;
export const T0 = "2026-10-04T12:00:00Z";

/** A scope address with an admitted, hand-made genesis: seed ordinal `n`, nonce bytes `n`. */
export const fixtureScope = (kind: ScopeKind, n: number): ScopeRef => {
  const seed: Seed = { v: 1, kind, definition: d("e"), creator: null, cause: d("c"), ordinal: n };
  // Made by hand: this genesis binds bytes to an address only. No judge admitted it.
  const entry: GenesisEntry = { v: 1, seq: 0, prev: null, time: T0, clamped: false, epoch: 0,
    input: { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(n)), kind: "fixture", founding: null, source: null, sourceKind: null, n: null, message: null, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const at = { scope: scopeIdOf(seed), genesis: entryHash(entry) };
  const sequence = admitSequenceGenesis(canonicalize(entry), at, PROPOSED_BOUNDS.entryBytes);
  if (!sequence) throw new Error("the canonical byte-association fixture must bind its genesis");
  return rememberSequence(sequence).at;
};
export const membership = fixtureScope("membership", 1);
export const directory = fixtureScope("directory", 2);
export const otherLane = fixtureScope("lane", 3);

export const member = (name: string): MemberRef => ({ membership, member: `@${name}` as MemberId });
