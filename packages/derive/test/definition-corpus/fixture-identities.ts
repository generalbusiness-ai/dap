/** Deterministic byte-association fixtures, never accepted Native birth or authority. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Digest, GenesisEntry, MemberId, MemberRef, ScopeKind, Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, entryHash, newGenesisNonce, scopeIdOf, type CheckedSequence } from "@generalbusiness/dap-bytes";
export const d = (c: string): Digest => `sha256:${c.repeat(64)}`;
export const T0 = "2026-10-04T12:00:00Z";

/** The admitted sequence of a hand-made genesis: seed ordinal `n`, nonce bytes `n`. Its `at` is the scope address. */
export const fixtureScope = (kind: ScopeKind, n: number): CheckedSequence => {
  const seed: Seed = { v: 1, kind, definition: d("e"), creator: null, cause: d("c"), ordinal: n };
  // Made by hand: this genesis binds bytes to an address only. No judge admitted it.
  const entry: GenesisEntry = { v: 1, seq: 0, prev: null, time: T0, clamped: false, epoch: 0,
    input: { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(n)), kind: "fixture", founding: null, source: null, sourceKind: null, n: null, message: null, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const at = { scope: scopeIdOf(seed), genesis: entryHash(entry) };
  const sequence = admitSequenceGenesis(canonicalize(entry), at, PROPOSED_BOUNDS.entryBytes);
  if (!sequence) throw new Error("the canonical byte-association fixture must bind its genesis");
  return sequence;
};
export const membershipSequence = fixtureScope("membership", 1);
export const directorySequence = fixtureScope("directory", 2);
export const otherLaneSequence = fixtureScope("lane", 3);
export const membership = membershipSequence.at;
export const directory = directorySequence.at;
export const otherLane = otherLaneSequence.at;

export const member = (name: string): MemberRef => ({ membership, member: `@${name}` as MemberId });
