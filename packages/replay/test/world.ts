/**
 * One good set of histories for every test of this package, made by derive's
 * fixture scopes in memory, which judge, seal and fold as a commit does: a
 * desk D, and two tickets it creates and confirms, P and I. P links to I,
 * which is a relationship update. A test copies the set and changes the
 * copy.
 *
 *   D: 0 genesis, 1 act (creates P), 2 P's result, 3 P's index row,
 *      4 act (creates I), 5 I's result, 6 I's index row
 *   P: 0 genesis, 1 confirmation, 2 act `link`, 3 I's result
 *   I: 0 genesis, 1 confirmation, 2 P's update
 */

import type { DeclaredDefinition, Entry, RetainedInput } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, digestBytes, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { born, deliver, fields, created, genesisOnly, keys, notesDefinition, type Ledger } from "@generalbusiness/dap-derive/testing";
import { MemorySource, hashOfBytes, type MemoryScope } from "../src/index.ts";

function written(judgment: { result: string }): void {
  if (judgment.result !== "write") throw new Error(`the fixture history was not written: ${JSON.stringify(judgment)}`);
}

/** The three ledgers that wrote the good histories, made anew. */
export function histories(): Record<"D" | "P" | "I", Ledger> {
  const D = created();
  const ticket = (title: string, mint: number): Ledger => {
    const act = D.did(keys.rita, "open-issue", fields({ title }));
    const { child, judgment } = born(D, act.seq, 0, mint);
    written(judgment);
    written(deliver(D, child, 0, 0));            // the result of the creation; D sends the confirmation
    written(deliver(child, D, D.head.seq, 0));   // the confirmation
    written(deliver(D, child, 0, 1));            // the index row the genesis held until then
    return child;
  };
  const P = ticket("P", 20);
  const I = ticket("I", 21);
  const link = P.did(keys.rita, "link", fields({ target: I.at, about: 0 }));
  written(deliver(I, P, link.seq, 0));
  written(deliver(P, I, I.head.seq, 0));
  return { D, P, I };
}

/** What a scope's object would serve: each entry's canonical bytes and hash, its declaration, and the bytes of each foreign entry it used. */
export function served(ledger: Ledger, all: readonly Ledger[]): MemoryScope {
  const retained: RetainedInput[] = [{ kind: "definition", digest: ledger.definition.digest, bytes: canonicalize(ledger.definition.declared) }];
  for (const { entry } of ledger.entries) {
    for (const use of entry.uses) {
      const owner = all.find((other) => other.at.scope === use.fact.at.scope)!;
      retained.push({ kind: "entry", digest: use.content, bytes: canonicalize(owner.entries[use.fact.seq]!.entry), under: owner.definition.declared.name });
    }
  }
  return { scope: ledger.at, entries: ledger.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained };
}

/** Untrusted synthetic bytes for replay refusal; the runtime never admits this declaration. */
export function unsupportedDefinitionHistory(declared: DeclaredDefinition, key: string): MemoryScope {
  const ledger = created(notesDefinition, {}, key), history = served(ledger, [ledger]);
  const genesis = entryOf(history, 0);
  if (history.entries.length !== 1 || genesis.input.type !== "genesis") throw new Error("unsupported definition fixture needs one genesis");
  const digest = definitionDigest(declared), seed = { ...genesis.input.seed, definition: digest };
  const entry: Entry = { ...genesisOnly(genesis), input: { ...genesis.input, seed } };
  const bytes = canonicalize(entry);
  const at = { scope: scopeIdOf(seed), genesis: hashOfBytes(bytes) };
  return { scope: at, entries: [{ seq: 0, hash: hashOfBytes(bytes), bytes }],
    retained: [{ kind: "definition", digest, bytes: canonicalize(declared) }] };
}

const GOOD = (() => {
  const { D, P, I } = histories();
  const all = [D, P, I];
  return { D: served(D, all), P: served(P, all), I: served(I, all) };
})();

export type World = typeof GOOD;

/** A copy of the good histories, to change. */
export const world = (): World => structuredClone(GOOD);
export const sourceOf = (w: World, pageSize = 2): MemorySource => new MemorySource(Object.values(w), pageSize);
export const entryOf = (scope: MemoryScope, seq: number): Entry => JSON.parse(scope.entries[seq]!.bytes) as Entry;

/**
 * Change entry `seq` and seal the history again from there: each later entry
 * takes the new hash of the one before it. The scope's own chain is then
 * intact, and only what the entries say has changed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rewrite(scope: MemoryScope, seq: number, change: (entry: any) => void): void {
  let prev: string | null = null;
  for (let i = seq; i < scope.entries.length; i++) {
    const entry = entryOf(scope, i) as { prev: string | null };
    if (i === seq) change(entry);
    else entry.prev = prev;
    const bytes = canonicalize(entry);
    prev = hashOfBytes(bytes);
    scope.entries[i] = { seq: i, hash: prev as never, bytes };
  }
}

/** The digest a `uses` records for a foreign entry: of its canonical bytes. */
export const contentOf = (bytes: string) => digestBytes(utf8(bytes));

/**
 * Change entry `seq` of one scope and seal every history of the world again, as its writers would have sealed it.
 * A changed genesis gives its scope a new genesis digest. Each later entry, in any scope, that names a changed
 * entry or genesis is written again with the new values: its `prev`, its `uses` and every reference in its input.
 * The entries are sealed in the order in which they used each other, so each history stays bound to its genesis.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reseal(w: World, name: keyof World, seq: number, change: (entry: any) => void): void {
  const names = Object.keys(w) as (keyof World)[];
  type Slot = { name: keyof World; seq: number; old: string; bytes: string };
  const slots: Slot[] = names.flatMap((n) => w[n].entries.map((e) => ({ name: n, seq: e.seq, old: e.hash as string, bytes: e.bytes })));
  const oldGenesis = new Map(names.map((n) => [n, w[n].scope.genesis as string]));
  const oldContent = new Map(slots.map((s) => [s.old, contentOf(s.bytes)]));
  const swap = new Map<string, string>();
  const done = new Set<Slot>();
  const needs = (s: Slot): Slot[] => slots.filter((o) => o !== s && (
    (o.name === s.name && o.seq === s.seq - 1)
    || s.bytes.includes(o.old) || s.bytes.includes(oldContent.get(o.old)!)
    || (o.seq === 0 && o.name !== s.name && s.bytes.includes(oldGenesis.get(o.name)!))));
  const replaceAll = (text: string): string => { for (const [from, to] of swap) text = text.split(from).join(to); return text; };
  const visit = (s: Slot, path: Set<Slot>): void => {
    if (done.has(s)) return;
    if (path.has(s)) throw new Error("the fixture histories use each other in a cycle");
    path.add(s);
    for (const o of needs(s)) visit(o, path);
    path.delete(s);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry: any = JSON.parse(replaceAll(s.bytes));
    if (s.name === name && s.seq === seq) change(entry);
    const bytes = canonicalize(entry), hash = hashOfBytes(bytes) as string;
    if (hash !== s.old) { swap.set(s.old, hash); swap.set(oldContent.get(s.old)!, contentOf(bytes)); }
    if (s.seq === 0 && hash !== oldGenesis.get(s.name)) swap.set(oldGenesis.get(s.name)!, hash);
    s.bytes = bytes; s.old = hash;
    done.add(s);
  };
  for (const s of slots) visit(s, new Set());
  for (const n of names) {
    const scope = w[n];
    scope.scope = { ...scope.scope, genesis: (swap.get(scope.scope.genesis as string) ?? scope.scope.genesis) as never };
    scope.entries = slots.filter((s) => s.name === n).sort((a, b) => a.seq - b.seq).map((s) => ({ seq: s.seq, hash: s.old as never, bytes: s.bytes }));
    scope.retained = scope.retained.map((r) => r.kind === "entry"
      ? (() => { const at = slots.find((s) => contentOf(s.bytes) === (swap.get(r.digest) ?? r.digest))!; return { ...r, digest: contentOf(at.bytes) as never, bytes: at.bytes }; })()
      : r);
  }
}
