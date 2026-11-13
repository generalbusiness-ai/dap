/** SCRIPTED: a destination genesis made by hand and admitted from its own bytes. No judge ran. */
import { PROPOSED_BOUNDS, type GenesisEntry, type ScopeRef } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, entryHash, newGenesisNonce, scopeIdOf } from "@generalbusiness/dap-bytes";
import { d, t } from "@generalbusiness/dap-derive/testing";

/** The genesis of a `platform:destination@17` scope with no creator. `fill`: the byte of its nonce. Its hash is the destination's genesis. */
export function destinationBirth(fill = 17) {
  const entry: GenesisEntry = { v: 1, seq: 0, prev: null, time: t(0), clamped: false, epoch: 0, input: { type: "genesis",
    seed: { v: 1, kind: "destination", definition: "platform:destination@17", creator: null, cause: d("e"), ordinal: 0 },
    nonce: newGenesisNonce(new Uint8Array(16).fill(fill)), kind: "establish", founding: null, source: null, sourceKind: null, n: null, message: null, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const hash = entryHash(entry), at: ScopeRef = { scope: scopeIdOf(entry.input.seed), genesis: hash };
  const sequence = admitSequenceGenesis(canonicalize(entry), at, PROPOSED_BOUNDS.entryBytes);
  if (!sequence) throw Error("The scripted destination genesis must admit its own bytes");
  return { genesis: { entry, hash }, at, sequence };
}
