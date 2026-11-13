/** Genesis identity admission and contextual resolution of encoded self. */
import type { Entry, FactRef, FactUse, ScopeId, ScopeKind, SequenceRef } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict, utf8 } from "./canonical.ts";
import { entryHash, scopeIdOf } from "./domains.ts";
import { digestBytes } from "./hash.ts";
import { isEntry, isFactRef, isGenesisSelfRef, isSequenceRef } from "./records.ts";

// An obtained instance.constructor cannot mint an association without this
// capability. It never appears on an instance, prototype, or exported value.
const CONSTRUCT_SEQUENCE = Symbol("checked-sequence-construction");
class SequenceAssociation {
  readonly #scope: ScopeId;
  readonly #genesis: SequenceRef["genesis"];
  readonly #kind: ScopeKind;
  readonly #birth: string;
  constructor(token: unknown, at: SequenceRef, kind: ScopeKind, birth: string) {
    if (token !== CONSTRUCT_SEQUENCE) throw new TypeError("sequence identity requires checked genesis bytes");
    this.#scope = at.scope;
    this.#genesis = at.genesis;
    this.#kind = kind;
    this.#birth = birth;
    Object.freeze(this);
  }
  get at(): Readonly<SequenceRef> { return Object.freeze({ scope: this.#scope, genesis: this.#genesis }); }
  get kind(): ScopeKind { return this.#kind; }
  /** The canonical bytes of the genesis that admitted this sequence (ruling a140a1c6, Q-B1). */
  get birth(): string { return this.#birth; }
  static owns(value: unknown, at: SequenceRef): value is SequenceAssociation {
    return typeof value === "object" && value !== null && #scope in value
      && value.#scope === at.scope && value.#genesis === at.genesis;
  }
}
Object.freeze(SequenceAssociation.prototype);
Object.freeze(SequenceAssociation);

/** A process-local result of actual genesis validation, never a wire record. */
export type CheckedSequence = SequenceAssociation;

/** Admit original bytes. The association keeps the checked identity, the kind and the canonical genesis bytes, so that an
 * entry that uses a later entry of the sequence can also record its birth (ruling a140a1c6, Q-B1). It keeps no parsed body. */
export function admitSequenceGenesis(bytes: string, expected: SequenceRef, maxBytes: number): CheckedSequence | null {
  try {
    if (!isSequenceRef(expected) || !Number.isSafeInteger(maxBytes) || maxBytes < 0
      || typeof bytes !== "string" || bytes.length > maxBytes || utf8(bytes).length > maxBytes) return null;
    const at = { scope: expected.scope, genesis: expected.genesis };
    if (!isSequenceRef(at)) return null;
    const entry: unknown = parseStrict(bytes);
    if (!isEntry(entry) || entry.input.type !== "genesis" || entry.seq !== 0 || entry.prev !== null
      || canonicalize(entry) !== bytes || entryHash(entry) !== at.genesis || scopeIdOf(entry.input.seed) !== at.scope) return null;
    return new SequenceAssociation(CONSTRUCT_SEQUENCE, at, entry.input.seed.kind, bytes);
  } catch { return null; }
}

/** Body integrity only. This predicate cannot authenticate the scope address. */
export function isEntryBodyOf(entry: Entry, fact: FactRef): boolean {
  try {
    return isEntry(entry) && isFactRef(fact) && entry.seq === fact.seq && entryHash(entry) === fact.hash
      && (entry.input.type === "genesis" ? entry.seq === 0 && entry.prev === null && fact.hash === fact.at.genesis
        : "genesis" in entry && entry.genesis === fact.at.genesis);
  } catch { return false; }
}

/** Full fact matching requires a genuine association admitted from genesis bytes. */
export function isEntryOf(entry: Entry, fact: FactRef, sequence: CheckedSequence): boolean {
  try { return isFactRef(fact) && SequenceAssociation.owns(sequence, fact.at) && isEntryBodyOf(entry, fact); }
  catch { return false; }
}

/** Resolve only a typed genesis-origin self reference, never an arbitrary record. */
export function resolveGenesisSelf(value: unknown, origin: FactRef): SequenceRef | null {
  if (isSequenceRef(value)) return value;
  return isGenesisSelfRef(value) && value.scope === origin.at.scope && origin.seq === 0 && origin.hash === origin.at.genesis
    ? { scope: origin.at.scope, genesis: origin.at.genesis } : null;
}

/** The use of a sequence's birth, from the genesis bytes its association holds: the use that an entry records beside a use of
 * a later entry of that sequence (ruling a140a1c6, Q-B1). */
export function birthUse(sequence: CheckedSequence): FactUse {
  const at = sequence.at;
  return { fact: { at: { scope: at.scope, genesis: at.genesis }, seq: 0, hash: at.genesis }, content: digestBytes(utf8(sequence.birth)), kind: sequence.kind };
}
