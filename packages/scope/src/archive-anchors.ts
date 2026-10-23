/** Explicit caller trust derived only from already admitted exported bytes.
 * No copied body is proof, and no private source journal is read/exported. */
import type { FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, isFactRef, isHead, isRecord, isScopeRef, parseStrict, same } from "@generalbusiness/dap-bytes";
import type { JournalSelection } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";

type Selection = { readonly at: ScopeRef; readonly objects: readonly { readonly foreign?: NonNullable<JournalSelection["objects"][number]["foreign"]> }[] };

/** `archived` is the exact producer closure selected for this repository.
 * Its copied facts must be replayed. Only Register17 and Membership8 facts
 * outside that closure may become anchors under decisions 5a642337 and
 * 066e49b3. Decision a7d03336 removes the copy-count bound: authority and
 * observation heads need no copy. These are candidate references; replay
 * with published trust must consult every listed fact in its own range.
 * An observed value remains on the caller's word with its head. */
export class ArchiveReplayAnchors {
  readonly #scopes = new Map<string, ScopeRef>();
  readonly #pins = new Map<string, string>();
  readonly #facts = new Map<string, FactRef>();
  constructor(selection: Selection, archived: readonly ScopeRef[], readonly budget: ArchiveBudget, readonly sources?: FixtureArchiveSourcePins) {
    budget.spend({ nodes: archived.length, metadata: archived.length * 512, inputWork: archived.length * 1024 });
    for (const at of archived) {
      const prior = this.#scopes.get(at.scope);
      if (prior && !same(prior, at)) return stop("foreign-source-mismatch");
      this.#scopes.set(at.scope, Object.freeze({ ...at }));
    }
    if (!same(this.#scopes.get(selection.at.scope), selection.at)) return stop("foreign-source-mismatch");
    for (const object of selection.objects) {
      budget.spend({ inputWork: 1024 });
      if (!object.foreign) continue;
      const { fact, pin } = object.foreign, key = canonicalize(fact.at), prior = this.#pins.get(key);
      if (prior && prior !== pin) return stop("foreign-source-mismatch");
      this.#pins.set(key, pin); this.#add(fact);
    }
  }
  #add(fact: FactRef): void {
    this.budget.spend({ inputWork: 1024 });
    const replayed = this.#scopes.get(fact.at.scope);
    if (replayed) {
      if (!same(replayed, fact.at)) return stop("foreign-source-mismatch");
      return;
    }
    if (fact.at.kind !== "register" && fact.at.kind !== "membership") return stop("unsupported-foreign-copy");
    const key = canonicalize(fact);
    if (!this.#facts.has(key)) {
      this.budget.spend({ metadata: 512 });
      this.#facts.set(key, Object.freeze({ at: Object.freeze({ ...fact.at }), seq: fact.seq, hash: fact.hash }));
    }
  }
  /** Only selected local entry bytes, after whole-prefix privacy admission.
   * The builder independently validates canonical bytes, hashes and chain
   * before `finish` can return a list. No copied body supplies source proof. */
  entry(bytes: string, maximum: number): void {
    this.budget.spend({ metadata: maximum, inputWork: maximum * 8 });
    if (typeof bytes !== "string" || bytes.length > maximum) return stop("mismatch");
    let entry: unknown;
    try { entry = parseStrict(bytes); } catch { return stop("mismatch"); }
    if (!isEntry(entry)) return stop("mismatch");
    const pending: unknown[] = [entry];
    while (pending.length) {
      this.budget.check(); const value = pending.pop();
      if (!value || typeof value !== "object") continue;
      if (isFactRef(value)) this.#add(value);
      if (isRecord(value) && isScopeRef(value["of"]) && Object.hasOwn(value, "head")) {
        const at = value["of"], head = value["head"];
        if (!isHead(head)) return stop("foreign-source-unavailable");
        this.#add({ at, seq: head.seq, hash: head.hash });
      }
      for (const child of Object.values(value)) pending.push(child);
    }
  }
  finish(): readonly FactRef[] {
    // Classify each distinct private source once; every call uses the same
    // original allowance. This fixture port performs no live source read.
    for (const fact of this.#facts.values()) {
      const key = canonicalize(fact.at);
      if (!this.#pins.has(key)) {
        const source = this.sources?.get(fact.at, this.budget);
        if (!source) return stop("foreign-source-unavailable");
        this.#pins.set(key, source.pin);
      }
      const pin = this.#pins.get(key);
      if (pin !== "platform:register@17" && pin !== "platform:membership@8") return stop("unsupported-foreign-copy");
    }
    this.budget.spend({ inputWork: this.#facts.size * 1024 * (Math.ceil(Math.log2(this.#facts.size + 1)) + 1) });
    const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
    const result = [...this.#facts.values()].sort((a, b) => compare(a.at.scope, b.at.scope) || a.seq - b.seq || compare(a.at.inc, b.at.inc) || compare(a.hash, b.hash));
    this.budget.check(); return Object.freeze(result);
  }
}

/** Copy-only metadata checks remain useful before any body is selected. */
export function archiveReplayAnchors(selection: Selection, archived: readonly ScopeRef[], budget: ArchiveBudget): readonly FactRef[] {
  return new ArchiveReplayAnchors(selection, archived, budget).finish();
}
