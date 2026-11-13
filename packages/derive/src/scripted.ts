/**
 * Scripted sequences, for scripted runs and tests only. A scripted run (a
 * CLI scenario or a story) and a test both need a scope's full reference
 * before any service has sealed its genesis. This module writes a real
 * genesis entry for a seed, so the reference is the seed's scope ID and the
 * hash of that entry, and `admitSequenceGenesis` admits its bytes like any
 * other genesis. Production judgment never calls it.
 */

import type { Digest, Entry, FactRef, GenesisEntry, ScopeRef, Seed, Send, SequenceEntry, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, factRefOf, newGenesisNonce, scopeIdOf } from "@generalbusiness/dap-bytes";

/** What a scripted resolver reads for one entry: the entry, and for a later entry the genesis bytes of its sequence. */
export interface ScriptedEntry { entry: Entry; under: string; birth?: string }

export interface ScriptedSequence {
  /** The full reference: the scope of the seed and the hash of the genesis. */
  readonly at: ScopeRef;
  /** The canonical bytes of the genesis entry. */
  readonly birth: string;
  readonly genesis: GenesisEntry;
  /** A later entry of the sequence at `seq`. `prev`: the hash it chains to, a placeholder by default. */
  entry(seq: number, input: SequenceEntry["input"], sends?: readonly Send[], prev?: Digest): SequenceEntry;
  /** The fact of an entry of this sequence. */
  fact(entry: Entry): FactRef;
  /** What a scripted resolver reads for that entry: the entry and the genesis bytes of its sequence. */
  source(entry: Entry, under: string): ScriptedEntry;
}

/** A scripted sequence for `seed`. `fill`: the byte of its genesis nonce, so two sequences of one seed differ. */
export function scriptedSequence(seed: Seed, time: Timestamp, fill = 7): ScriptedSequence {
  const genesis: GenesisEntry = {
    v: 1, seq: 0, prev: null, time, clamped: false, epoch: 0,
    input: { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(fill)), kind: "establish", founding: null, n: null, message: null, decision: "applied", source: null, sourceKind: null },
    uses: [], prepared: [], effects: [], sends: [],
  };
  const at: ScopeRef = { scope: scopeIdOf(seed), genesis: entryHash(genesis) };
  const birth = canonicalize(genesis);
  return {
    at, birth, genesis,
    entry: (seq, input, sends = [], prev = `sha256:${"0".repeat(64)}`) => {
      if (seq < 1) throw new Error("a scripted later entry has a position above zero");
      return { v: 1, genesis: at.genesis, seq, prev, time, clamped: false, epoch: 0, input, uses: [], prepared: [], effects: [], sends };
    },
    fact: (entry) => factRefOf(entry, at),
    source: (entry, under) => (entry.seq === 0 ? { entry, under } : { entry, under, birth }),
  };
}
