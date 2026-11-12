/** Test-only: the admitted sequences that fixtures made, by address. A
 * hand-made source names the sequence of its scope from here. Nothing in
 * production reads this registry. */
import { canonicalize, type CheckedSequence } from "@generalbusiness/dap-bytes";
import type { SequenceRef } from "@generalbusiness/dap-contract";

const admitted = new Map<string, CheckedSequence>();
const key = (at: SequenceRef): string => canonicalize({ scope: at.scope, genesis: at.genesis });

/** Remember a sequence that `admitSequenceGenesis` admitted. Returns it. */
export function rememberSequence(sequence: CheckedSequence): CheckedSequence {
  admitted.set(key(sequence.at), sequence);
  return sequence;
}

/** The admitted sequence at an address. Throws when no fixture admitted one. */
export function sequenceAt(at: SequenceRef): CheckedSequence {
  const sequence = admitted.get(key(at));
  if (!sequence) throw new Error(`no fixture admitted the sequence ${at.scope} ${at.genesis}`);
  return sequence;
}
