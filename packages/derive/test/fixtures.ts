/**
 * One fixture set for every test of derivation, and for the packages that
 * build on it: a key set, four small definitions, and a scope in memory that
 * judges, seals and folds the way a runtime's commit does.
 *
 * `lane` is an issue-like lane: an intent, commitments, holds that end by
 * time, reports that take a commitment's attribution, and links to other
 * lanes. `small` is one item type with an act for each refusal and each guard
 * family. `desk` is a small directory that creates `ticket` lanes, by an act
 * and by a handler; a ticket links to another ticket, asks its desk for a
 * new one, and has one act under a rule. The names are made up.
 */

import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Bounds, DeclaredDefinition, Digest, Entry, FactRef, FieldValue, Grant, Input, Intent, KeyId, MemberRef, ObservationUse, ScopeRef, Seed, Send, SignedIntent, Timestamp } from "@generalbusiness/dap-contract";
import { entryHash, factRefOf, intentDigest, keyIdOfSecret, newIncarnation, scopeIdOf, signIntent } from "@generalbusiness/artroom-bytes";
import { MemoryState, actionOf, applyEntry, clockOf, entryOf, judgeAct, judgeDelivery, judgeGenesis, judgeTimed, messageFacts, nextDue, timeMs, timeOf, validateDefinition } from "../src/index.ts";
import type { ActJudgment, Creation, Delivered, DeliveryContext, Draft, Fetched, JudgeContext, Judgment, Presented, Source, TimedJudgment, ValidDefinition, Validation } from "../src/index.ts";

import { lane, small, notes, ticket, desk } from "./definition-corpus/fixture-data.ts";
export { lane, small, notes, ticket, desk } from "./definition-corpus/fixture-data.ts";

// This fixture uses the runtime's native clone. Keep its type local to this module.
declare function structuredClone<T>(value: T): T;

import { d, T0, membership, directory, member } from "./definition-corpus/fixture-identities.ts";
export { d, T0, membership, directory, otherLane, member } from "./definition-corpus/fixture-identities.ts";
/** `seconds` after T0. */
export const t = (seconds: number): Timestamp => timeOf(timeMs(T0)! + seconds * 1000);

/** A key, the member it acts as, and the member it acts for. */
export interface Actor { secret: Uint8Array; key: KeyId; member: MemberRef; principal: MemberRef | null }
const actor = (n: number, name: string, principal: string | null = null): Actor => {
  const secret = new Uint8Array(32).fill(n);
  return { secret, key: keyIdOfSecret(secret), member: member(name), principal: principal === null ? null : member(principal) };
};
/** The requester; two agents, each acting for an owner; and a member with no part in anything. */
export const keys = { rita: actor(1, "rita"), una: actor(2, "una", "paul"), vic: actor(3, "vic", "quinn"), paul: actor(4, "paul"), sam: actor(5, "sam") };

export function valid(v: Validation): ValidDefinition {
  if (!v.ok) throw new Error(`the fixture definition is refused: ${JSON.stringify(v.problems)}`);
  return v.definition;
}
/** One native clone and explicit fixture mutation. Callers retain their own
 * validation options and choice of validation result or accepted definition. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function changedDraft<T>(base: T, change: (definition: any) => void): T {
  const definition = structuredClone(base);
  change(definition);
  return definition;
}
/** A fixture definition with one change, validated. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function variant(base: DeclaredDefinition, change: (definition: any) => void): ValidDefinition {
  const definition = changedDraft(base, change);
  return valid(validateDefinition(definition, PROPOSED_BOUNDS));
}
export const laneDefinition = valid(validateDefinition(lane, PROPOSED_BOUNDS));
export const smallDefinition = valid(validateDefinition(small, PROPOSED_BOUNDS));

export const notesDefinition = valid(validateDefinition(notes, PROPOSED_BOUNDS));
export const ticketDefinition = valid(validateDefinition(ticket, PROPOSED_BOUNDS));
export const deskDefinition = valid(validateDefinition(desk, PROPOSED_BOUNDS));

// ---------------------------------------------------------------- a scope in memory

/** A stand-in: these grants carry no freshness proof, as the first delivery's judges take every recorded grant as current. Its bytes are `null`, so no digest here moves. */
const NO_PROOF = null as unknown as ObservationUse;

/** A grant of every action of the definition to that actor's key, in that scope. A test authority, and named as one. */
export function grantOf(who: Actor, within: ScopeRef, actions: readonly string[], notAfter: Timestamp | null = null): Grant {
  return { issued: { at: membership, seq: 3, hash: d("3") }, subject: who.member, key: who.key, principal: who.principal, actions, within, notAfter, fresh: NO_PROOF };
}

export type Over = Partial<Pick<Intent, "on" | "expected" | "fields" | "idempotencyKey" | "notAfter" | "to" | "kind">>;
export type Context = Partial<Omit<JudgeContext, "clock">> & { reading?: Timestamp };

/**
 * One scope's history and state in memory. It does what a commit does: judge
 * at one reading, seal, hash, fold. `under` is the name a reader of this
 * scope gives its definition: the name the definition states.
 */
export class Ledger {
  readonly state = new MemoryState();
  readonly entries: { entry: Entry; hash: Digest }[] = [];
  /** The reading of the next commit. */
  now: Timestamp = T0;
  bounds: Bounds = PROPOSED_BOUNDS;
  #keys = 0;
  readonly #received = new Map<Digest, Fetched>();
  remember(facts: readonly Fetched[]): void { for (const fact of facts) this.#received.set(fact.fact.hash, fact); }

  constructor(readonly definition: ValidDefinition, readonly under = definition.declared.name) {}

  get at() { return this.state.scope()!.at; }
  get head() { return this.state.scope()!.head; }
  get last() { return this.entries.at(-1)!.entry; }
  item(id: number) { return this.state.item(id)!; }
  /** This scope's own entry at a position, as a commit reads it from its history. */
  readonly own = (seq: number) => this.entries[seq] ?? null;
  /** The fact of a sealed entry: a view beside it. */
  fact(seq: number): FactRef { return { at: this.at, seq, hash: this.entries[seq]!.hash }; }
  get foldOptions(): import("../src/index.ts").DrawOptions { return { bounds: this.bounds, own: this.own, facts: [...this.#received.values()] }; }
  fold(entry: Entry): Entry {
    const hash = entryHash(entry);
    applyEntry(this.state, this.definition, entry, hash, this.foldOptions);
    this.entries.push({ entry, hash });
    return entry;
  }
  seal(draft: Draft, reading: Timestamp = this.now): Entry {
    return this.fold(entryOf(this.state, draft, clockOf(this.state, reading)));
  }

  /** An intent to this scope, with a new idempotency key, admissible for a minute from `now`. */
  intent(who: Actor, kind: string, over: Over = {}): SignedIntent {
    const intent: Intent = { v: 1, to: this.at, actor: who.key, kind, on: null, expected: {}, fields: {}, idempotencyKey: `k${this.#keys++}`, notAfter: timeOf(timeMs(this.now)! + 60_000), ...over };
    return signIntent(intent, who.secret);
  }
  /** Every actor of the key set holds every action here, unless the test presents other grants. */
  grants(): Presented[] {
    // In platform data the `grant` of an act may be a mark, which states an action or none.
    const actions = Object.values(this.definition.declared.acts).flatMap((a) => actionOf(a) ?? []);
    return Object.values(keys).map((who) => ({ grant: grantOf(who, this.at, actions), current: true }));
  }
  context(over: Context = {}): JudgeContext {
    const { reading, ...rest } = over;
    return { clock: clockOf(this.state, reading ?? this.now), grants: this.grants(), facts: [], prepared: [], bounds: this.bounds, own: this.own, ...rest };
  }
  /** Judge only: nothing is written. */
  judge(signed: SignedIntent, over: Context = {}): ActJudgment {
    return judgeAct(this.state, this.definition, signed, this.context(over));
  }
  /** Judge, and write the entry if the judgment is to write. */
  submit(signed: SignedIntent, over: Context = {}): ActJudgment {
    const judgment = this.judge(signed, over);
    if (judgment.result === "write") this.seal(judgment.draft, over.reading);
    return judgment;
  }
  act(who: Actor, kind: string, over: Over = {}, context: Context = {}): ActJudgment {
    return this.submit(this.intent(who, kind, over), context);
  }
  /** An act that must be written. Returns its entry. */
  did(who: Actor, kind: string, over: Over = {}): Entry {
    const judgment = this.act(who, kind, over);
    if (judgment.result !== "write") throw new Error(`${kind} was not written: ${JSON.stringify(judgment)}`);
    return this.last;
  }
  /** The drain of section 5.2, step 3, at `now`: each due transition as its own entry. */
  drain(): TimedJudgment[] {
    const done: TimedJudgment[] = [];
    for (let due = nextDue(this.state, this.definition, this.now); due; due = nextDue(this.state, this.definition, this.now)) {
      const judgment = judgeTimed(this.state, this.definition, due, this.context());
      done.push(judgment);
      if (judgment.result !== "write") break;
      this.seal(judgment.draft);
    }
    return done;
  }
  /** The first `count` entries, or all, folded again into a new state, as a verifier does. */
  replay(count = this.entries.length): MemoryState {
    const fresh = new MemoryState();
    for (const { entry, hash } of this.entries.slice(0, count)) applyEntry(fresh, this.definition, entry, hash, this.foldOptions);
    return fresh;
  }
}

/**
 * A lane created by a directory and confirmed, with both entries made by
 * hand: its genesis opened item 0 for `opener` (entry 0) and its creator's
 * confirmation made it active (entry 1), both at T0. `ordinal` tells two
 * such lanes apart.
 */
export class Scope extends Ledger {
  constructor(definition: ValidDefinition, opener: MemberRef = keys.rita.member, confirmed = true, ordinal = 0) {
    super(definition);
    const declared = definition.declared;
    const type = declared.acts[declared.genesis]!.on!;
    const seed: Seed = { v: 1, kind: "lane", definition: definition.digest, creator: directory, cause: d("c"), ordinal };
    const at: ScopeRef = { scope: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(9 + ordinal)), kind: "lane" };
    const source = { at: directory, seq: 17, hash: d("7") };
    const message = { class: "request", type: "create", body: { fields: { opener } } } as const;
    const slot = Object.keys(declared.items[type]!.parties)[0]!;
    this.fold({
      v: 1, at, seq: 0, prev: null, time: T0, clamped: false, epoch: 0,
      input: { type: "genesis", seed, inc: at.inc, kind: declared.genesis, "founding": null, source, n: 0, message, decision: "applied" }, uses: [], prepared: [],
      effects: [{ effect: "open", item: 0, type, state: declared.items[type]!.initial }, { effect: "party", item: 0, slot, member: opener }],
      sends: [{ n: 0, to: directory, message: { class: "result", of: { from: source, n: 0 }, outcome: "applied" } }],
    });
    if (confirmed) {
      this.fold({
        v: 1, at, seq: 1, prev: this.head.hash, time: T0, clamped: false, epoch: 0,
        input: { type: "delivery", from: { at: directory, seq: 18, hash: d("8") }, n: 0, message: { class: "control", type: "confirm", genesis: this.fact(0) } },
        uses: [], prepared: [], effects: [{ effect: "activate" }], sends: [],
      });
    }
  }
}

// ---------------------------------------------------------------- entries passed between scopes

/**
 * A directory created by rita's signed intent (section 7.1): its genesis is judged, sealed and folded. `definition`: the desk, or
 * a desk with a change, or with `given` another definition and the fields of its genesis act. `key` tells two foundings apart.
 */
export function created(definition: ValidDefinition = deskDefinition, given: Intent["fields"] = { source: "a repository" }, key = "found"): Ledger {
  const ledger = new Ledger(definition);
  const creation = signIntent({ v: 1, to: null, actor: keys.rita.key, kind: "found", on: null, expected: {}, fields: given, idempotencyKey: key, notAfter: t(60) }, keys.rita.secret);
  const seed: Seed = { v: 1, kind: "directory", definition: definition.digest, creator: null, cause: intentDigest(creation.intent), ordinal: 0 };
  const context = { clock: clockOf(ledger.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source: null };
  const judgment = judgeGenesis(ledger.state, definition, { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(1)), seed, creation: creation }, context);
  if (judgment.result !== "write") throw new Error(`the directory was not founded: ${JSON.stringify(judgment)}`);
  ledger.seal(judgment.draft);
  return ledger;
}

/** Send `n` of entry `seq` of `from`, as it arrives, and the source entry as the receiver reads it. */
export function sent(from: Ledger, seq: number, n = 0): { delivered: Delivered; source: Source } {
  const { entry } = from.entries[seq]!;
  const send = entry.sends.find((s) => s.n === n)!;
  const birth = from.entries[0]?.entry.input;
  // This in-memory source reader has the actual ledger's genesis. Tests of
  // missing metadata must omit it explicitly; no payload supplies this pin.
  return { delivered: { to: send.to, from: from.fact(seq), n, message: send.message }, source: { entry, under: from.under, ...(birth?.type === "genesis" ? { pin: birth.seed.definition } : {}) } };
}

/** What a test changes in a delivery: the envelope, or the source entry that is read. */
export type Arrival = Partial<Delivered> & { source?: Source | null };

/** The context of a delivery to `to`: the source entry, the foreign entries that were fetched, and for a result this scope's own entry that sent the request. */
export function arriving(to: Ledger, delivered: Delivered, source: Source | null, facts: readonly Fetched[] = []): DeliveryContext {
  to.remember([...facts, ...(source ? [{ fact: delivered.from, entry: source.entry, under: source.under }] : [])]);
  const of = delivered.message.class === "result" ? delivered.message.of : null;
  return { clock: clockOf(to.state, to.now), bounds: to.bounds, facts, prepared: [], own: to.own, source, origin: of ? (to.entries[of.from.seq]?.entry ?? null) : null };
}

/**
 * Judge the delivery of that send to `to`. Nothing is written. As a receiver
 * does before its turn, this fetches the foreign entries that the message's
 * declared fields name. It can read only the sender's history.
 */
export function judged(to: Ledger, from: Ledger, seq: number, n = 0, over: Arrival = {}): Judgment {
  const { delivered, source } = sent(from, seq, n);
  const { source: read = source, ...envelope } = over;
  const arrival = { ...delivered, ...envelope };
  const message = arrival.message;
  const named = message.class === "request" || message.class === "advisory" ? messageFacts(to.state, to.definition, message, arrival.from, to.bounds, read?.under ?? from.under) : [];
  const facts = named.flatMap((fact): Fetched[] => (fact.at.scope === from.at.scope && from.entries[fact.seq] ? [{ fact, entry: from.entries[fact.seq]!.entry, under: from.under }] : []));
  return judgeDelivery(to.state, to.definition, arrival, arriving(to, arrival, read, facts));
}

/** Judge it, and write the entry if the judgment is to write. */
export function deliver(to: Ledger, from: Ledger, seq: number, n = 0): Judgment {
  const judgment = judged(to, from, seq, n);
  if (judgment.result === "write") to.seal(judgment.draft);
  return judgment;
}

/** The creation that send `n` of entry `seq` of `from` asks for, as it reaches the object its seed names. `mint` makes the incarnation. */
export function creation(from: Ledger, seq: number, n = 0, mint = 20): { asked: Creation; source: Source } {
  const { delivered, source } = sent(from, seq, n);
  const seed = delivered.to as Seed;
  return { asked: { name: scopeIdOf(seed), inc: newIncarnation(new Uint8Array(16).fill(mint)), to: seed, from: delivered.from, n, message: delivered.message as Creation["message"] }, source };
}

/** A new store that receives that creation: the child's genesis is judged and, if it is to be written, sealed. */
export function born(from: Ledger, seq: number, n = 0, mint = 20): { child: Ledger; judgment: Judgment } {
  const child = new Ledger(ticketDefinition);
  const { asked, source } = creation(from, seq, n, mint);
  const judgment = judgeGenesis(child.state, ticketDefinition, asked, { clock: clockOf(child.state, T0), bounds: PROPOSED_BOUNDS, facts: [], prepared: [], source });
  if (judgment.result === "write") child.seal(judgment.draft);
  return { child, judgment };
}

/** An entry made by hand, as a source that some scope might return: it has a hash, and nothing judged it. */
export function forged(at: ScopeRef, seq: number, input: Input, sends: readonly Send[]): Source {
  return { entry: { v: 1, at, seq, prev: d("0"), time: T0, clamped: false, epoch: 0, input, uses: [], prepared: [], effects: [], sends }, under: "ticket" };
}

let made = 100;
/**
 * A message from an entry of `from` that is made by hand, delivered to `to`.
 * The entry holds that one send, and nothing judged it. `input`: what the
 * entry says it recorded. `facts`: the foreign entries that were fetched for
 * the delivery. The receiver's entry is written if the judgment is to write.
 */
export function arrive(to: Ledger, from: Ledger, message: Send["message"], input: Input = from.entries[1]!.entry.input, facts: readonly Fetched[] = []): Judgment {
  const send: Send = { n: 0, to: to.at, message };
  const source = forged(from.at, ++made, input, [send]);
  const arrival = { ...send, from: factRefOf(source.entry) };
  const judgment = judgeDelivery(to.state, to.definition, arrival, arriving(to, arrival, source, facts));
  if (judgment.result === "write") to.seal(judgment.draft);
  return judgment;
}

/** The decision of the request that the last entry of `s` decided, and the code of the reason on its result. */
export function decided(s: Ledger): string[] {
  const result = s.last.sends.at(-1)!.message;
  if (result.class !== "result") throw new Error("the last entry decided no request");
  return result.reason ? [result.outcome, result.reason.code] : [result.outcome];
}

/** Short forms for a transition's `on` with its expected revision, and for fields. */
export const on = (scope: Ledger, id: number, also: Record<string, number> = {}): Over => ({
  on: id, expected: { on: scope.item(id).revision, ...Object.fromEntries(Object.entries(also).map(([name, other]) => [name, scope.item(other).revision])) },
});
export const fields = (f: Record<string, FieldValue>): Over => ({ fields: f });
