/** Local retained statements and content-proved associations; no storage policy. */
import type { Digest, Entry, FactRef, ScopeKind, Sealed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalBytes, canonicalize, digestBytes, freeze, isDigest, isEntry, isEntryBodyOf, isEntryOf, isFactRef, isFactUse, natural, parseStrict, rawRetainedJSON, same, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import type { RetainedOwn } from "./fields.ts";
import type { Fetched } from "./guards.ts";

export interface RetainedUse {
  readonly mode: "local-retained-use";
  readonly origin: FactRef;
  readonly useIndex: number;
  readonly fact: FactRef;
  readonly content: Digest;
  readonly kind: ScopeKind;
  readonly entry: Entry;
  readonly originalBytes: string;
  readonly producer: { readonly name: string | undefined; readonly provenance: "unhashed-retained-row" };
}
export type SelectedRetainedUse =
  | { readonly mode: "retained-birth"; readonly use: RetainedUse; readonly sequence: CheckedSequence }
  | { readonly mode: "retained-later"; readonly use: RetainedUse };
export type ClassifiedRetainedUse =
  | { readonly mode: "genuine"; readonly use: RetainedUse; readonly sequence: CheckedSequence }
  | { readonly mode: "local-retained-use"; readonly use: RetainedUse };
export type RetainedUseRead =
  | { readonly status: "ready"; readonly value: SelectedRetainedUse }
  | { readonly status: "invalid-index" | "missing-use" | "invalid-use" };
export type RetainedUseProjection =
  | { readonly status: "ready"; readonly values: readonly ClassifiedRetainedUse[] }
  | { readonly status: "invalid-use" };
export type RetainedSelectionResult =
  | { readonly status: "missing-origin" | "invalid-origin" }
  | {
      readonly status: "ready";
      readonly origin: Sealed;
      readonly uses: readonly { readonly index: number; readonly fact: FactRef; readonly content: Digest; readonly kind: ScopeKind }[];
      read(index: number): RetainedUseRead;
      reuseSelectedAt(index: number, selected: SelectedRetainedUse): RetainedUseRead;
      reuseHeldAt(index: number, held: SelectedRetainedUse): RetainedUseRead;
      project(selected: readonly SelectedRetainedUse[], heldFetched: readonly Fetched[]): RetainedUseProjection;
    };

const CONSTRUCT = Symbol("local-retained-construction");
const object = (value: unknown): value is object => typeof value === "object" && value !== null;
class LocalUse implements RetainedUse {
  readonly #owner: object;
  readonly mode = "local-retained-use" as const;
  constructor(token: unknown, owner: object, readonly origin: FactRef, readonly useIndex: number,
    readonly fact: FactRef, readonly content: Digest, readonly kind: ScopeKind, readonly entry: Entry,
    readonly originalBytes: string, readonly producer: RetainedUse["producer"]) {
    if (token !== CONSTRUCT) throw new TypeError("retained use requires its actual local origin and row");
    this.#owner = owner;
    Object.freeze(this);
  }
  static is(value: unknown): value is LocalUse { return object(value) && #owner in value; }
  static belongs(value: unknown, owner: object): value is LocalUse { return LocalUse.is(value) && value.#owner === owner; }
}
class SelectedBirth {
  readonly #owner: object;
  readonly #sequence: CheckedSequence;
  readonly mode = "retained-birth" as const;
  constructor(token: unknown, owner: object, readonly use: LocalUse, sequence: CheckedSequence) {
    if (token !== CONSTRUCT) throw new TypeError("retained birth requires checked original bytes");
    this.#owner = owner; this.#sequence = sequence; Object.freeze(this);
  }
  get sequence(): CheckedSequence { return this.#sequence; }
  static belongs(value: unknown, owner: object): value is SelectedBirth { return object(value) && #owner in value && value.#owner === owner; }
  static ownsUse(value: unknown): value is SelectedBirth { return object(value) && #owner in value && LocalUse.belongs(value.use, value.#owner); }
}
class SelectedLater {
  readonly #owner: object;
  readonly mode = "retained-later" as const;
  constructor(token: unknown, owner: object, readonly use: LocalUse) {
    if (token !== CONSTRUCT) throw new TypeError("retained selection requires its actual local row");
    this.#owner = owner; Object.freeze(this);
  }
  static belongs(value: unknown, owner: object): value is SelectedLater { return object(value) && #owner in value && value.#owner === owner; }
  static ownsUse(value: unknown): value is SelectedLater { return object(value) && #owner in value && LocalUse.belongs(value.use, value.#owner); }
}
class GenuineUse {
  readonly #sequence: CheckedSequence;
  readonly mode = "genuine" as const;
  constructor(token: unknown, readonly use: LocalUse, sequence: CheckedSequence) {
    if (token !== CONSTRUCT) throw new TypeError("retained association requires checked birth provenance");
    this.#sequence = sequence; Object.freeze(this);
  }
  get sequence(): CheckedSequence { return this.#sequence; }
  static is(value: unknown): value is GenuineUse { return object(value) && #sequence in value; }
}
class BodyUse {
  readonly #use: LocalUse;
  readonly mode = "local-retained-use" as const;
  constructor(token: unknown, use: LocalUse) {
    if (token !== CONSTRUCT) throw new TypeError("retained body requires its actual local row");
    this.#use = use; Object.freeze(this);
  }
  get use(): LocalUse { return this.#use; }
  static is(value: unknown): value is BodyUse { return object(value) && #use in value; }
}
for (const value of [LocalUse, SelectedBirth, SelectedLater, GenuineUse, BodyUse]) {
  Object.freeze(value.prototype); Object.freeze(value);
}

/** Private fields, rather than a mode word, prototype, or caller constructor. */
export function isRetainedUse(value: unknown): value is RetainedUse { return LocalUse.is(value); }

/** Inspect the original private classification. The returned view is not proof. */
export function inspectClassifiedRetainedUse(value: unknown): ClassifiedRetainedUse | null {
  try {
    if (GenuineUse.is(value)) {
      const { use, sequence } = value;
      if (!LocalUse.is(use) || sequence.kind !== use.kind || !isEntryOf(use.entry, use.fact, sequence)) return null;
      return Object.freeze({ mode: "genuine" as const, use, sequence });
    }
    if (BodyUse.is(value)) {
      const use = value.use;
      return LocalUse.is(use) ? Object.freeze({ mode: "local-retained-use" as const, use }) : null;
    }
    return null;
  } catch { return null; }
}

/** One actual local origin read. Retained bodies are read only by selected index. */
export function readRetainedUses(own: RetainedOwn, originSeq: number): RetainedSelectionResult {
  try {
    if (typeof own !== "function" || typeof own.sequence !== "function" || typeof own.retainedRow !== "function" || !natural(originSeq)) return { status: "invalid-origin" };
    const held = own(originSeq);
    if (!held) return { status: "missing-origin" };
    const sequence = own.sequence();
    if (!sequence || !isDigest(held.hash)) return { status: "invalid-origin" };
    const entry: unknown = parseStrict(canonicalize(held.entry));
    const origin: FactRef = { at: sequence.at, seq: originSeq, hash: held.hash };
    if (!isEntry(entry) || !isEntryOf(entry, origin, sequence)) return { status: "invalid-origin" };
    const source = entry.input.type === "delivery" ? entry.input.from : entry.input.type === "genesis" ? entry.input.source : null;
    const sourceKind = entry.input.type === "delivery" || entry.input.type === "genesis" ? entry.input.sourceKind : null;
    for (let index = 0; index < entry.uses.length; index++) {
      const use = entry.uses[index]!;
      if (!isFactUse(use) || source && same(use.fact.at, source.at) && use.kind !== sourceKind
        || entry.uses.slice(0, index).some(previous => same(previous.fact.at, use.fact.at) && previous.kind !== use.kind)) return { status: "invalid-origin" };
    }
    freeze(entry); freeze(origin);
    const sealed = Object.freeze({ entry, hash: held.hash });
    const uses = Object.freeze(entry.uses.map((use, index) => Object.freeze({ index, fact: use.fact, content: use.content, kind: use.kind })));
    // This empty private identity carries no Own port, entry, or body closure.
    const owner = Object.freeze({});
    const read = (index: number): RetainedUseRead => {
      try {
        if (!natural(index) || index >= uses.length) return { status: "invalid-index" };
        const use = uses[index]!, row = own.retainedRow(use.content);
        if (!row) return { status: "missing-use" };
        if (row.kind !== "entry" || row.digest !== use.content || typeof row.bytes !== "string" || row.under !== undefined && typeof row.under !== "string") return { status: "invalid-use" };
        const bytes = row.bytes, parsed = rawRetainedJSON(use.content, bytes);
        if (!isEntry(parsed) || !isEntryBodyOf(parsed, use.fact)) return { status: "invalid-use" };
        freeze(parsed);
        const value = new LocalUse(CONSTRUCT, owner, origin, index, use.fact, use.content, use.kind, parsed, bytes,
          Object.freeze({ name: row.under, provenance: "unhashed-retained-row" }));
        if (use.fact.seq !== 0) return { status: "ready", value: new SelectedLater(CONSTRUCT, owner, value) };
        const birth = admitSequenceGenesis(bytes, use.fact.at, utf8(bytes).length);
        if (!birth || birth.kind !== use.kind || !isEntryOf(parsed, use.fact, birth)) return { status: "invalid-use" };
        return { status: "ready", value: new SelectedBirth(CONSTRUCT, owner, value, birth) };
      } catch { return { status: "invalid-use" }; }
    };
    // Reuse only a row that THIS selection already read, at an equal actual use.
    // Ordinary read(index) still performs each requested row read, even on failure.
    const reuseSelectedAt = (index: number, selected: SelectedRetainedUse): RetainedUseRead => {
      try {
        if (!natural(index) || index >= uses.length) return { status: "invalid-index" };
        if (!SelectedBirth.belongs(selected, owner) && !SelectedLater.belongs(selected, owner)) return { status: "invalid-use" };
        const held = selected.use;
        if (!LocalUse.belongs(held, owner) || !same(held.origin, origin)) return { status: "invalid-use" };
        const original = uses[held.useIndex], target = uses[index]!;
        if (!original || !same(original.fact, held.fact) || original.content !== held.content || original.kind !== held.kind
          || !same(target.fact, held.fact) || target.content !== held.content || target.kind !== held.kind) return { status: "invalid-use" };
        if (SelectedBirth.belongs(selected, owner)
          && (target.fact.seq !== 0 || selected.sequence.kind !== target.kind || !isEntryOf(held.entry, target.fact, selected.sequence))) return { status: "invalid-use" };
        const use = new LocalUse(CONSTRUCT, owner, origin, index, target.fact, target.content, target.kind,
          held.entry, held.originalBytes, held.producer);
        return { status: "ready", value: SelectedBirth.belongs(selected, owner)
          ? new SelectedBirth(CONSTRUCT, owner, use, selected.sequence) : new SelectedLater(CONSTRUCT, owner, use) };
      } catch { return { status: "invalid-use" }; }
    };
    // Re-own an original private selection only at this same authenticated origin.
    // This selection still performs its own origin read; no row is read here.
    const reuseHeldAt = (index: number, selected: SelectedRetainedUse): RetainedUseRead => {
      try {
        if (!natural(index) || index >= uses.length) return { status: "invalid-index" };
        if (!SelectedBirth.ownsUse(selected) && !SelectedLater.ownsUse(selected)) return { status: "invalid-use" };
        const held = selected.use;
        if (!same(held.origin, origin) || !natural(held.useIndex) || held.useIndex >= uses.length) return { status: "invalid-use" };
        const original = uses[held.useIndex]!, target = uses[index]!;
        if (!same(original.fact, held.fact) || original.content !== held.content || original.kind !== held.kind
          || !same(target.fact, held.fact) || target.content !== held.content || target.kind !== held.kind) return { status: "invalid-use" };
        const sequence = SelectedBirth.ownsUse(selected) ? selected.sequence : null;
        if (sequence && (target.fact.seq !== 0 || sequence.kind !== target.kind || !isEntryOf(held.entry, target.fact, sequence))) return { status: "invalid-use" };
        const use = new LocalUse(CONSTRUCT, owner, origin, index, target.fact, target.content, target.kind,
          held.entry, held.originalBytes, held.producer);
        return { status: "ready", value: sequence
          ? new SelectedBirth(CONSTRUCT, owner, use, sequence) : new SelectedLater(CONSTRUCT, owner, use) };
      } catch { return { status: "invalid-use" }; }
    };
    const project = (selected: readonly SelectedRetainedUse[], heldFetched: readonly Fetched[]): RetainedUseProjection => {
      try {
        if (!Array.isArray(selected) || !Array.isArray(heldFetched)) return { status: "invalid-use" };
        const values: (SelectedBirth | SelectedLater)[] = [];
        for (const value of selected) {
          if (!SelectedBirth.belongs(value, owner) && !SelectedLater.belongs(value, owner)) return { status: "invalid-use" };
          if (!LocalUse.belongs(value.use, owner)) return { status: "invalid-use" };
          const use = uses[value.use.useIndex];
          if (!use || !same(use.fact, value.use.fact) || use.content !== value.use.content || use.kind !== value.use.kind) return { status: "invalid-use" };
          if (SelectedBirth.belongs(value, owner) && (value.use.fact.seq !== 0 || value.sequence.kind !== use.kind || !isEntryOf(value.use.entry, use.fact, value.sequence))) return { status: "invalid-use" };
          values.push(value);
        }
        // Only genuine birth copies belonging to THIS origin may be supplied.
        // Keep minimal associations during this call; no cache/map survives it.
        const fetched: { fact: FactRef; sequence: CheckedSequence }[] = [];
        for (const value of heldFetched) {
          const fact: unknown = parseStrict(canonicalize(value.fact)), entry: unknown = parseStrict(canonicalize(value.entry)), sequence = value.sequence;
          if (!isFactRef(fact) || fact.seq !== 0 || !isEntry(entry) || entry.input.type !== "genesis" || !isEntryOf(entry, fact, sequence)) return { status: "invalid-use" };
          const content = digestBytes(canonicalBytes(entry));
          if (!uses.some(use => same(use.fact, fact) && use.content === content && use.kind === sequence.kind)) return { status: "invalid-use" };
          fetched.push({ fact, sequence });
        }
        const result: ClassifiedRetainedUse[] = [];
        for (const value of values) {
          let birth = SelectedBirth.belongs(value, owner) ? value.sequence : null;
          for (const candidate of values) {
            if (SelectedBirth.belongs(candidate, owner) && same(candidate.use.fact.at, value.use.fact.at)) {
              if (birth && birth.kind !== candidate.sequence.kind) return { status: "invalid-use" };
              birth = candidate.sequence;
            }
          }
          for (const candidate of fetched) if (same(candidate.fact.at, value.use.fact.at)) {
            if (birth && birth.kind !== candidate.sequence.kind) return { status: "invalid-use" };
            birth = candidate.sequence;
          }
          if (birth) {
            // SAME exported association matcher as Scope.proofEntry, without
            // its wire cap or canonical-spelling requirement for later rows.
            if (birth.kind !== value.use.kind || !isEntryOf(value.use.entry, value.use.fact, birth)) return { status: "invalid-use" };
            result.push(new GenuineUse(CONSTRUCT, value.use, birth));
          } else result.push(new BodyUse(CONSTRUCT, value.use));
        }
        return { status: "ready", values: Object.freeze(result) };
      } catch { return { status: "invalid-use" }; }
    };
    return Object.freeze({ status: "ready" as const, origin: sealed, uses, read, reuseSelectedAt, reuseHeldAt, project });
  } catch { return { status: "invalid-origin" }; }
}
