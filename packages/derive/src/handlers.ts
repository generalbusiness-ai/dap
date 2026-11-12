/**
 * What the judges share beside the reading of fields (scope contract,
 * sections 5.2, 6.4, 6.6 and 7.4): how a delivered message finds its
 * handler, how an act or handler selects its other items, how the written
 * forms of an act or handler are derived, and how the clause of an earlier
 * send is run again from the entry that sent it.
 */

import { nativeMark, nativeOutcomes } from "./program/native.ts";
import type { ActType, Advisory, AlsoMark, AlsoRule, Bounds, Digest, Effect, EffectForm, Entry, FactRef, FactUse, FieldType, FieldValue, Input, PlatformReceive, Reason, ReceiveType, RefusalReason, Request, ResultClauses, ScopeRef, ScopeKind, SendForm, SendMark, Settles, UnavailableReason } from "@generalbusiness/dap-contract";
import { entryHash, isScopeKind } from "@generalbusiness/dap-bytes";
import { handlerBranch } from "./handler-branch.ts";
import { executeBody, type Ran } from "./program/body.ts";
import { declarationOf } from "./program/declaration.ts";
export type { Ran } from "./program/body.ts";
export { overMax } from "./program/finalize.ts";
import type { Signer } from "./attribution.ts";
import { boundTo, decisionCounts, selectedByIndex, selectorOf } from "./binding.ts";
import { creationFields, factsNamed, isEntryOf, isLocalFact, messageFields, presentedTypes, readFields, textsNamed, updateOf, type Reading, type Update } from "./fields.ts";
import { signerOf } from "./fold.ts";
import { slotOf, type Fetched, type Judging } from "./guards.ts";
import { assumedSource, copyFact, judgmentFacts, matchesCopy, readJudgmentFacts, verifiedCopy, type JudgmentCopy } from "./operand.ts";
import { RuleFault, atHand, atHandByRows, placesOf, fieldOutsideType, selectedBy, type AtHand, type Giving, type JudgedInput } from "./marks.ts";
import { listedBy, rowsOfClause, settle, waits, type Needed, type Settled, type Settling } from "./observes.ts";
import { sendOrigin } from "./program/send-origin.ts";
import { bodyJudgesClock, clauseStructure, handlerBody, handlerHeader, namedBody, sendClauseStructure, type BodyStructure } from "./program/structure.ts";
import { settlementForm, settlementMatches } from "./program/settlement.ts";
import type { Item, OwnRequest, ScopeState, StateView } from "./state.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { isFactRef, isLocalId, isObject, own, same } from "./values.ts";
import { sequenceEffects } from "./effects.ts";

// ---------------------------------------------------------------- messages and handlers (sections 6.4 and 7.4)

/**
 * The handler a delivered message runs, and the fields the message gives it.
 * A handler is found by the message's class and name and the sender's kind:
 * a `tell` by the name the request declares, a `relate` by the
 * relationship's name, and an advisory by its type. The validator has shown
 * there is at most one. The fields are the message's own, and for a `relate`
 * the update's detail. Null: the message states no name. `fields` null: the
 * body is not the shape of its message. `handler` null: the definition
 * declares none. A handler is looked for before the fields are read, so a
 * message that no handler receives is `unknown-message` whatever it holds.
 *
 * `under`: the name of the definition that the sender pins, where the
 * caller has read the source entry. A handler whose `from` names another
 * definition does not receive the message, and its field types say nothing
 * of it. The validator allows one handler for a class, a name and a kind,
 * so no other handler receives it either.
 */
export function bound(definition: ValidDefinition, message: Request | Advisory, from: FactRef, sourceKind: ScopeKind, under?: string): { kind: string; handler: ReceiveType | null; fields: Record<string, FieldValue> | null } | null {
  if (!isScopeKind(sourceKind)) throw new RuleFault("handler selection requires the recorded or checked sender kind");
  const body = message.body;
  let kind: string;
  if (message.class === "advisory") kind = message.type;
  else if (message.type === "tell" || message.type === "relate") {
    const named = isObject(body) ? body[message.type === "tell" ? "message" : "name"] : undefined;
    if (typeof named !== "string") return null;
    kind = named;
  } else return null;
  const cls = message.class === "advisory" ? "advisory" : message.type;
  const matched = Object.values(declarationOf(definition).receives).find((h) => h.class === cls && h.message === kind && h.from.kind === sourceKind) ?? null;
  const handler = matched && (under === undefined || matched.from.under === undefined || matched.from.under === under) ? matched : null;
  // The mark `self` is read by the type that the handler declares for the field.
  const types = handler?.fields ?? {};
  let fields: Record<string, FieldValue> | null;
  if (message.class === "advisory") fields = isObject(body) && Object.hasOwn(body, "fields") ? messageFields(body["fields"], from, types) : {};
  else if (message.type === "tell") fields = messageFields((body as Record<string, unknown>)["fields"], from, types);
  else fields = updateOf(message, from) ? messageFields((body as Record<string, unknown>)["detail"], from, types) : null;
  return { kind, handler, fields };
}

/**
 * The fields of a message, read against the fields its handler declares
 * (section 6.4). An unknown or ill-typed field is not read. A message names
 * a local item of its receiver by the fact of the entry that opened it
 * (section 6.6). So where the declared type is `item`, in a field, an element
 * of a list or a member of a record, to any depth, that fact is read as the
 * item's local ID: the inverse of `wire` in `sends.ts`. A fact that names no
 * such entry is left as it is, and is then no value of the type. Whether
 * the item is of the declared type is checked with the other items, by
 * `readFacts`.
 */
function messageRead(view: StateView, at: ScopeRef, handler: ReceiveType, given: Readonly<Record<string, FieldValue>>, bounds: Bounds) {
  const local = (type: FieldType | undefined, v: FieldValue): FieldValue => {
    if (type?.type === "list" && Array.isArray(v)) return v.map((e: FieldValue) => local(type.of, e));
    if (type?.type === "record" && isObject(v)) return Object.fromEntries(Object.entries(v).map(([name, member]) => [name, local(own(type.of, name), member as FieldValue)]));
    return type?.type === "item" && isFactRef(v) && isLocalFact(v, at) && view.item(v.seq)?.opened === v.hash ? v.seq : v;
  };
  return readFields(handler.fields, Object.fromEntries(Object.entries(given).map(([name, v]) => [name, local(own(handler.fields, name), v)])), bounds);
}

/** Internal evidence failure, not a serialized phase or a guessed count. */
class UnprovenDecisionBinding extends Error {
  constructor(texts: ReadonlySet<Digest>) {
    super(`the decision binding and draw are unproven: original UTF-8 size or reviewed phase evidence is owed for ${[...texts].join(", ")}`);
  }
}

/** The verifier may report this private evidence failure as incomplete. */
export const isUnprovenDecisionBinding = (error: unknown): error is Error => error instanceof UnprovenDecisionBinding;

/** Detached field bounds, by digest. No code or byte read is needed. */
function detachedBounds(types: Readonly<Record<string, FieldType & { default?: FieldValue }>>, fields: Readonly<Record<string, FieldValue>>): Map<Digest, number> {
  const limits = new Map<Digest, number>();
  const read = (type: FieldType, value: FieldValue | undefined): void => {
    if (type.type === "text" && type.detached && typeof value === "string") limits.set(value as Digest, Math.min(limits.get(value as Digest) ?? Number.POSITIVE_INFINITY, type.max));
    else if (type.type === "list" && Array.isArray(value)) for (const element of value) read(type.of, element);
    else if (type.type === "record" && isObject(value)) for (const [name, member] of Object.entries(type.of)) read(member, own(value, name) as FieldValue | undefined);
  };
  for (const [name, type] of Object.entries(types)) read(type, own(fields, name) ?? type.default);
  return limits;
}

/** Bounds established by one successful field check. These are upper
 * bounds from a verified phase, never retained sizes. */
export function checkedTextBounds(definition: ValidDefinition, input: Entry["input"]): ReadonlyMap<Digest, number> {
  if (input.type === "act") return detachedBounds(own(declarationOf(definition).acts, input.signed.intent.kind)?.fields ?? {}, input.signed.intent.fields);
  if (input.type === "genesis" && input.decision === "applied") {
    const fields = own(declarationOf(definition).acts, declarationOf(definition).genesis)!.fields;
    const given = input.founding ? input.founding.intent.fields : input.source ? creationFields(input.message, input.source, fields) : null;
    return given ? detachedBounds(fields, given) : new Map();
  }
  if (input.type === "delivery" && "decision" in input && input.message.class === "request" && (input.decision === "applied" || input.decision === "superseded" && input.message.type === "tell")) {
    const received = bound(definition, input.message, input.from, input.sourceKind);
    if (received?.handler && received.fields) return detachedBounds(received.handler.fields, received.fields);
  }
  return new Map();
}

/** A previous successful check of this same digest can prove its bound after erasure. */
function priorDetachedBounds(definition: ValidDefinition, context: Reading, at: ScopeRef, before: number): Map<Digest, number> {
  const limits = new Map<Digest, number>();
  if (context.own) {
    for (const proof of context.own.sizeProofs?.() ?? []) if (proof.seq < before) limits.set(proof.digest, Math.min(limits.get(proof.digest) ?? Infinity, proof.bound));
    const positions = context.own.positions?.(before) ?? (function* () { for (let seq = 0; seq < before; seq++) yield seq; })();
    for (const seq of positions) {
      const kept = context.own(seq), sequence = context.own.sequence();
      if (!kept || !sequence || !isEntryOf(kept.entry, { at, seq, hash: kept.hash }, sequence)) continue;
      for (const [digest, max] of checkedTextBounds(definition, kept.entry.input)) limits.set(digest, Math.min(limits.get(digest) ?? Infinity, max));
    }
  }
  return limits;
}

/**
 * The binding of a recorded deciding entry, reconstructed by the same
 * field and subject checks as its judge. The refusal's code says nothing
 * about which phase refused: a guard or an effect can use bad-field too.
 * Only pre-guard code (type rules and selectors) is run. Retained inputs
 * supply its source, facts, texts and local history; no guard or effect is
 * rerun, and no runtime-only Draft.bound is trusted.
 */
export function decisionBinding(view: StateView, definition: ValidDefinition, entry: Pick<Entry, "seq" | "input">, context: Reading): { item: number; message: string } | null {
  const input = entry.input;
  if (input.type !== "delivery" || input.message.class !== "request" || input.message.type !== "tell" || !("decision" in input)) return null;
  const scope = view.scope();
  const source = context.facts.find((fact) => same(fact.fact, input.from));
  const matched = bound(definition, input.message, input.from, input.sourceKind, source?.under);
  if (!scope || !matched?.handler || !matched.fields || !(matched.handler as unknown as PlatformReceive).bound) return null;
  if (!source || !isEntryOf(source.entry, input.from, source.sequence) || source.sequence.kind !== input.sourceKind) throw new RuleFault("a decision binding has no matching retained source entry");
  const unknownSizes = new Set<Digest>();
  const texts = context.texts ? (digest: Digest) => {
    const size = context.texts!(digest);
    if (size === null) unknownSizes.add(digest);
    return size;
  } : undefined;
  const ready = prepareHandler(view, definition, { ...context, texts }, scope, matched.handler, matched.kind, matched.fields, { source, update: null }, { type: "delivery", from: input.from, sourceKind: input.sourceKind, n: input.n, message: input.message });
  if (ready.result === "unavailable") throw new RuleFault(`a decision binding cannot reconstruct its field and subject checks: ${ready.reason}`);
  // Owner disposition 4157eaa2: first exhaust structural checks under the
  // ordinary redaction assumptions. An early failure or no remaining
  // matching holder proves no draw. Applied/superseded or a named guard
  // proves the earlier size checks passed. Only a bare bad-field refusal
  // can still be either an over-max field (no draw) or a later effect
  // refusal (a draw). No later checkpoint may decide between those.
  if (ready.result === "ready" && ready.bound !== undefined && unknownSizes.size > 0 && input.decision === "refused" && input.reason?.code === "bad-field" && input.reason.name === undefined) {
    const required = detachedBounds(matched.handler.fields, ready.j.fields);
    const proven = priorDetachedBounds(definition, context, scope.at, entry.seq);
    const unresolved = new Set([...unknownSizes].filter((digest) => (proven.get(digest) ?? Number.POSITIVE_INFINITY) > (required.get(digest) ?? 0)));
    if (unresolved.size > 0) throw new UnprovenDecisionBinding(unresolved);
  }
  return ready.result === "ready" && ready.bound !== undefined ? { item: ready.bound, message: matched.kind } : null;
}

/**
 * The foreign entries that the declared fields of a delivered message name,
 * beside the source entry: what its receiver fetches before the turn, as it
 * fetches those an act names (section 5.2, step 1). None when the message
 * runs no handler, or its fields are not the ones the handler declares.
 * `under`: the name of the definition that the sender pins, which the
 * receiver read with the source entry.
 */
export function messageFacts(view: StateView, definition: ValidDefinition, message: Request | Advisory, from: FactRef, sourceKind: ScopeKind, bounds: Bounds, under: string): FactRef[] {
  const scope = view.scope();
  const b = scope && bound(definition, message, from, sourceKind, under);
  if (!scope || !b?.handler || !b.fields) return [];
  const read = messageRead(view, scope.at, b.handler, b.fields, bounds);
  return read.ok ? factsNamed(b.handler.fields, read.fields, scope.at).filter((f) => f.hash !== from.hash) : [];
}

/**
 * The digest of each detached text that an input names (section 6.2): in
 * the fields of an act, a signed creation intent or a creator's request,
 * and in the declared fields of a message that a handler receives. The scope keeps the bytes of
 * each as a retained input with the entry that records the input, and a
 * verifier asks for the same ones. A result, a control, a message that no
 * handler receives, and an input that is not an act of the definition name
 * none. `under`: for a delivery, the name of the definition that its
 * sender pins, as the receiver read it with the source entry.
 */
export function inputTexts(definition: ValidDefinition, input: Input, under?: string): Digest[] {
  const { acts, genesis } = declarationOf(definition);
  if (input.type === "act") return textsNamed(own(acts, input.signed.intent.kind)?.fields ?? {}, input.signed.intent.fields);
  if (input.type === "genesis") return textsNamed(own(acts, genesis)!.fields, input["founding"] ? input["founding"].intent.fields : input.source ? creationFields(input.message, input.source, own(acts, genesis)!.fields) : null);
  if (input.type !== "delivery" || input.message.class !== "request" && input.message.class !== "advisory") return [];
  return messageTexts(definition, input.message, input.from, input.sourceKind, under);
}

/** The digest of each detached text that the declared fields of a delivered message name. None when no handler receives the message. `under`: as for `bound`. */
export function messageTexts(definition: ValidDefinition, message: Request | Advisory, from: FactRef, sourceKind: ScopeKind, under: string | undefined): Digest[] {
  const b = bound(definition, message, from, sourceKind, under);
  return b?.handler ? textsNamed(b.handler.fields, b.fields) : [];
}

// ---------------------------------------------------------------- the other items of an act or handler (section 6.4)

/**
 * The items of a type that is not `many`, lowest ID first, and no more than
 * two: `one` selects an item only when there is exactly one. `before`: only
 * the items that existed before the entry at that position.
 */
function ones(view: StateView, definition: ValidDefinition, type: string, before?: number): Item[] {
  const matched = view.page(type, Object.keys(own(declarationOf(definition).items, type)!.states), null, 2).items;
  return before === undefined ? [...matched] : matched.filter((i) => i.id < before);
}

/**
 * Each `also` name that is bound, with the item it selects. `by` selects the
 * item that a field names: by its local ID, or by a local fact, which is the
 * position of the entry that opened the item. `via` selects the item that a
 * slot of another subject names. `one` selects the one item of a type that
 * is not `many`. A name is unbound, and is left out, when its field is
 * absent, when its slot is empty or its subject is unbound, or when the type
 * has no item yet. A name that selects something which is no item of its
 * type refuses the input, `no-item`; so does a `one` type with two items.
 *
 * A `via` is resolved after the subject whose slot it reads, whatever the
 * order of the names: a canonical definition keeps none. `on`: the primary
 * item when it exists before the entry. `before`: for a clause that runs in
 * a later entry, the position of the entry that made the send; `one` then
 * selects among the items that entry found.
 *
 * Section 4.2, check 8: in platform data a name may be a mark, and its rule
 * gives one local item of the stated type, or none. `select` runs that
 * rule, with the names that are bound so far. With none the name is
 * unbound. Without `select`, as for a clause that runs in a later entry, a
 * name that a mark selects is unbound: the validator lets no clause name
 * one. `marked` in the result: the names that a mark selects, which have no
 * key in an intent's `expected`.
 */
export function alsoItems(view: StateView, definition: ValidDefinition, also: Readonly<Record<string, AlsoRule>>, fields: Readonly<Record<string, FieldValue>>, on: Item | null, before?: number,
  select?: (mark: AlsoMark, bound: ReadonlyMap<string, Item>) => Item | null): { ok: true; items: [string, Item][]; marked: ReadonlySet<string> } | { ok: false; detail: string } {
  const marked = new Set<string>();
  /** The subjects that are bound when a rule is run: the primary item, and each name resolved before it. */
  const bound = (): Map<string, Item> => new Map([...(on ? [["on", on] as const] : []), ...[...matched].flatMap(([name, item]) => (item ? [[`also.${name}`, item] as const] : []))]);
  const matched = new Map<string, Item | null>();
  let refusal: string | null = null;
  const typed = (name: string, type: string, id: unknown): Item | null => {
    const item = isLocalId(id) ? view.item(id) : null;
    if (item?.type === type) return item;
    refusal ??= `${name} names no ${type}`;
    return null;
  };
  const resolve = (name: string): Item | null => {
    const known = matched.get(name);
    if (known !== undefined) return known;
    const rule = own(also, name);
    matched.set(name, null);
    let item: Item | null = null;
    if (!rule) return null;
    const mark = nativeMark(definition, rule, "also");
    if (mark) {
      marked.add(name);
      item = select ? select(mark, bound()) : null;
    } else if ("by" in rule) {
      const id = own(fields, rule.by);
      item = id === undefined ? null : typed(name, rule.item, id);
    } else if ("via" in rule) {
      const from = rule.via.of === "on" ? on : resolve(rule.via.of.slice(5));
      const id = from ? slotOf(from, rule.via.slot) : null;
      item = id === null ? null : typed(name, rule.item, id);
    } else {
      const all = ones(view, definition, rule.item, before);
      if (all.length > 1) refusal ??= `${name}: there is more than one ${rule.item}`;
      item = all.length === 1 ? all[0]! : null;
    }
    matched.set(name, item);
    return item;
  };
  const items = Object.keys(also).flatMap((name): [string, Item][] => { const item = resolve(name); return item ? [[name, item]] : []; });
  return refusal === null ? { ok: true, items, marked } : { ok: false, detail: refusal };
}

/** The judge's rule input before body execution: no subjects at check 7, then the subjects bound at check 8. */
export const giving = (view: StateView, definition: ValidDefinition, context: Reading, scope: Judging["scope"], self: number, judged: JudgedInput, ran: { clock: boolean }, fields: Readonly<Record<string, FieldValue>>, facts: ReadonlyMap<Digest, JudgmentCopy>, source?: JudgmentCopy): Giving =>
  ({ view, definition, clock: context.clock, bounds: context.bounds, scope, self, fields, subjects: new Map(), signer: null, facts, own: context.own, source, platform: context.platform, judged, ran });

export interface ItemSettlement { item: number; form: Extract<Settles, { of: unknown }> }

/** The judge and fold use the same condition for an actual item settlement. */
export function itemSettledBy(form: ItemSettlement["form"], before: Item | undefined, after: Item | undefined): boolean {
  return settlementMatches(form.in, "sets" in form ? form.sets : null, before, after);
}

/** Identify the recorded form's item on the pre-entry state. Guards and
 * effects are not rerun, and no runtime-only Draft hint is trusted. */
export function itemSettlementBinding(view: StateView, definition: ValidDefinition, entry: Pick<Entry, "seq" | "input" | "effects">, context: Reading, values?: readonly string[]): ItemSettlement | null {
  const scope = view.scope(), input = entry.input;
  // In particular a refused advisory has no decision flag, but also has
  // no item effect. It must not reconstruct failed fields as a settlement.
  if (!scope || !entry.effects.some(effect => effect.effect === "state" || effect.effect === "value" || effect.effect === "hold")) return null;
  if (input.type === "act") {
    const act = own(declarationOf(definition).acts, input.signed.intent.kind);
    const plan = act ? namedBody(definition, "act", input.signed.intent.kind, "act")?.settlement : null;
    if (!act || !plan || plan.op === "copy") return null;
    const form = settlementForm(plan);
    if (form.of === "on") return input.signed.intent.on === null ? null : { item: input.signed.intent.on, form };
    const read = readFields(act.fields, input.signed.intent.fields, context.bounds);
    if (!read.ok) throw new RuleFault("an item settlement cannot reconstruct its act fields");
    const local = { at: scope.at, own: context.own, texts: context.texts };
    const named = readJudgmentFacts(view, act.fields, read.fields, judgmentFacts(context), local);
    const presents = presentedTypes(act.presents), shown = readFields(presents, input.presented, context.bounds);
    const extra = shown.ok ? readJudgmentFacts(view, presents, shown.fields, judgmentFacts(context), local) : null;
    if (named.result !== "read" || extra?.result !== "read") throw new RuleFault("an item settlement cannot reconstruct its act facts");
    const facts = new Map([...named.facts, ...extra.facts]);
    const fields = named.fields, places = placesOf(act.fields, fields);
    const beside = definition.observing ? atHandByRows(values, places) : atHand(input.observed, values, places);
    const g = { ...giving(view, definition, context, scope, entry.seq, { type: "act", signed: input.signed, grant: null, presented: input.presented }, { clock: false }, fields, facts), beside };
    const primary = act.step === "transition" && input.signed.intent.on !== null ? view.item(input.signed.intent.on) : null;
    const subjects = alsoItems(view, definition, act.also, fields, primary, undefined, (mark, bound) => selectedBy({ ...g, subjects: bound }, mark));
    if (!subjects.ok) throw new RuleFault("an item settlement cannot reconstruct its act subjects");
    const item = subjects.items.find(([name]) => name === form.of.slice("also.".length))?.[1];
    return item ? { item: item.id, form } : null;
  }
  if (input.type !== "delivery" || (input.message.class !== "request" && input.message.class !== "advisory")) return null;
  if ("decision" in input && input.decision !== "applied") return null;
  const source = context.facts.find(fact => same(fact.fact, input.from));
  const matched = bound(definition, input.message, input.from, input.sourceKind, source?.under);
  const plan = matched?.handler ? handlerBody(definition, matched.handler)?.settlement : null;
  if (!matched?.handler || !matched.fields || !plan || plan.op === "copy") return null;
  if (!source || !isEntryOf(source.entry, input.from, source.sequence) || source.sequence.kind !== input.sourceKind) throw new RuleFault("an item settlement has no matching retained source entry");
  const form = settlementForm(plan);
  const ready = prepareHandler(view, definition, context, scope, matched.handler, matched.kind, matched.fields,
    { source, update: input.message.class === "request" ? updateOf(input.message, input.from) : null },
    { type: "delivery", from: input.from, sourceKind: input.sourceKind, n: input.n, message: input.message });
  if (ready.result !== "ready") throw new RuleFault("an item settlement cannot reconstruct its handler subjects");
  const item = ready.j.subjects.get(form.of);
  return item ? { item: item.id, form } : null;
}


/**
 * What a handler reads of its delivery beside the message's fields (section
 * 6.5): the source entry, which the receiver read and checked before it
 * recorded anything, and for a relationship update the update being applied.
 */
export interface Sent { source: Fetched; update: Update | null }

/** What a handler did. `uses`: the foreign entries that its message's fields name, which the entry records beside the source entry (section 9.2). */
export type Handled = (Exclude<Ran, { result: "unavailable" }> & { uses: FactUse[] }) | Extract<Ran, { result: "unavailable" }>;

/**
 * A handler, run on a delivered message (section 6.4): it has guards and
 * effects like an act, and no signer. `given` are the message's fields,
 * which are read against the fields the handler declares. A handler that
 * opens a type which is `many` opens one item, and that is its `on`. One
 * that opens a type which is not `many` opens it only if the scope has none;
 * otherwise `on` is the one that exists. No two names may select one item.
 */
type HandlerPreparation =
  | { result: "ready"; j: Judging; body: BodyStructure; uses: FactUse[]; bound?: number }
  | Exclude<Handled, { result: "ran" }>;

/** Checks 7 and 8 only. Both the judge and the fold reconstruct this stage. */
function prepareHandler(view: StateView, definition: ValidDefinition, context: Reading, scope: ScopeState, handler: ReceiveType, kind: string, given: Readonly<Record<string, FieldValue>>, sent?: Sent, judged?: JudgedInput): HandlerPreparation {
  const body = handlerBody(definition, handler);
  if (!body) throw new TypeError("handler body was not captured by its validation");
  handler = handlerHeader(definition, body);
  if (handler.message !== kind) throw new TypeError("program belongs to another body");
  const clocked = { clock: false };
  const refused = (reason: RefusalReason, detail: string, uses: FactUse[] = []): Exclude<Handled, { result: "ran" }> =>
    (clocked.clock && context.clock.behind ? { result: "unavailable", reason: "clock-behind" } : { result: "refused", reason, detail, prepared: [], uses });
  const { bounds } = context;
  const read = messageRead(view, scope.at, handler, given, bounds);
  if (!read.ok) return refused("bad-field", read.detail);
  // The source entry is one of the foreign entries this entry uses.
  if (factsNamed(handler.fields, read.fields, scope.at).length >= bounds.usesPerEntry) return refused("bad-field", `more than ${bounds.usesPerEntry} foreign entries`);
  // Section 6.2: a fact that names this scope is a local fact. A foreign one was fetched before the turn, or the delivery is not decided.
  const source = sent ? verifiedCopy(sent.source) : assumedSource(context);
  if (source && !matchesCopy(source, copyFact(source))) return { result: "unavailable", reason: "dependency-unavailable" };
  const update = sent?.update ?? (source && judged?.type === "delivery" && judged.message.class === "request" && judged.message.type === "relate" ? updateOf(judged.message, copyFact(source)) : null);
  const named = readJudgmentFacts(view, handler.fields, read.fields, source ? [...judgmentFacts(context), source] : judgmentFacts(context), { at: scope.at, own: context.own, texts: context.texts });
  if (named.result === "unavailable") return { result: "unavailable", reason: "dependency-unavailable" };
  if (named.result !== "read") return refused(named.result, named.detail, named.uses);
  const { fields, facts, uses } = named;
  // Platform data: what a rule of this row is given before the row's forms are derived (section 6.1). A handler has no check 9.
  const g = judged ? giving(view, definition, context, scope, scope.head.seq + 1, judged, clocked, fields, facts, source ?? undefined) : null;
  // Section 4.2, check 7: a field whose type is a mark is checked by the mark's rule.
  const outside = g && fieldOutsideType(g, handler.fields);
  if (outside) return refused("bad-field", `${outside} is not a value of its type`, uses);

  const subjects = new Map<string, Item>();
  if (handler.opens !== null) {
    const held = own(declarationOf(definition).items, handler.opens)!.many ? [] : ones(view, definition, handler.opens);
    if (held.length > 1) return refused("no-item", `there is more than one ${handler.opens}`, uses);
    if (held.length === 1) subjects.set("on", held[0]!);
  }
  // The item this entry opens does not exist yet, and the validator lets no `via` of a handler read `on`.
  // Section 4.2, check 8: a name of `also` that a mark selects is resolved by the mark's rule.
  // Section 17.2a, revision 23: the mark that binds the name which `bound.of` names is a binding selector. The judge makes the one
  // lookup of the declared index, and runs the rule on what it returns and on the fields, and on nothing else.
  const selector = selectorOf(handler, definition);
  const also = alsoItems(view, definition, handler.also, fields, null, undefined, g ? (mark, bound) => (mark === selector ? selectedByIndex(g, selector) : selectedBy({ ...g, subjects: bound }, mark)) : undefined);
  if (!also.ok) return refused("no-item", also.detail, uses);
  for (const [name, item] of also.items) subjects.set(`also.${name}`, item);
  if (new Set([...subjects.values()].map((i) => i.id)).size !== subjects.size) return refused("alias", "two names resolve to one item", uses);
  const j: Judging = {
    view, definition, bounds, clock: context.clock, scope, self: scope.head.seq + 1, kind, fields, fieldTypes: handler.fields, subjects, signer: null,
    facts, prepared: context.prepared, used: [], asked: context.asked, own: context.own, snapshot: context.snapshot, capabilities: context.capabilities, platform: context.platform, judged, ran: clocked,
    // Section 6.5: `sender` is the envelope's source scope, `source` reads the source entry, and `update` the update, whose revision is the `seq` of the owner's entry.
    sender: source ? copyFact(source).at : undefined, source: source ?? undefined, update: update && source ? { state: update.state, item: update.item, revision: copyFact(source).seq } : undefined,
  };
  // Section 17.2a: whether the delivery is bound is derived here, after the names are bound and before any guard of the handler,
  // on the state before the entry. It decides nothing of the request.
  const item = boundTo(j, handler, kind, context.counts ?? decisionCounts(view));
  if (item) j.bound = true;
  if (clocked.clock && context.clock.behind) return { result: "unavailable", reason: "clock-behind" };
  return { result: "ready", j, body, uses, ...(item ? { bound: item.id } : {}) };
}

export function runHandler(view: StateView, definition: ValidDefinition, context: Reading, scope: ScopeState, handler: ReceiveType, kind: string, given: Readonly<Record<string, FieldValue>>, cause: Digest, sent?: Sent, judged?: JudgedInput): Handled {
  const ready = prepareHandler(view, definition, context, scope, handler, kind, given, sent, judged);
  if (ready.result !== "ready") return ready;
  const ran = executeBody(ready.j, ready.body, cause);
  // A clock-declaring rule that refused still judged time (§5.3). Its
  // original reading cannot be recovered from a clamped recorded time.
  if (ready.j.ran?.clock && context.clock.behind) return { result: "unavailable", reason: "clock-behind" };
  return ran.result === "unavailable" ? ran : { ...ran, uses: ready.uses, ...(ready.bound === undefined ? {} : { bound: ready.bound }) };
}

// ---------------------------------------------------------------- the clause of an earlier send (sections 6.6 and 7.4)

export type Clause = keyof ResultClauses | "conflict";

/**
 * The effects of one clause of a request this scope sent, when its result or
 * its diagnosis is recorded. The send's form, and the fields, subjects and
 * signer its clause reads, are read again from `origin`, the entry that sent
 * it, which the caller supplies from this scope's own history and which is
 * checked against the hash the state keeps. The subjects are read as they are
 * now. A clause whose effects cannot apply now, as when its item has reached
 * a final state, changes nothing: the result is still recorded.
 *
 * `uses`: the foreign entries this judgment read. A clause with effects reads
 * every fact the origin's fields name, so the entry that records the clause
 * records them again (section 9.2). The origin entry recorded them first.
 *
 * `answered`: for a result, the scope that answered and the reason on the
 * result, which a clause may read as `sender` and `result` (section 6.6),
 * and the verified source entry of the result. A diagnosis has none.
 *
 * `judged`: the input of the entry that runs the clause, the delivery of
 * the result or the diagnosis, for a mark among the clause's effects, in
 * platform data. Its rule is run when the clause runs (section 4.2).
 *
 * `beside`: for the delivery of a result, the further observations at hand,
 * which a rule of the clause reads and the entry then retains (sections 4.1
 * and 16.1). A diagnosis may hold none, and is given none.
 */
export function runClause(view: StateView, definition: ValidDefinition, context: Reading & { origin?: Entry | null | undefined }, scope: ScopeState, request: OwnRequest, clause: Clause, answered?: { sender: ScopeRef; reason?: Reason; source?: Fetched }, judged?: JudgedInput, beside?: AtHand,
  given?: Pick<Settling, "observed" | "values" | "observing">):
  { result: "ran"; effects: Effect[]; uses: FactUse[]; judgesTime: boolean; rows?: Settled } | { result: "unavailable"; reason: UnavailableReason; missing?: readonly Needed[]; rows?: Settled } {
  const origin = context.origin;
  if (!origin || origin.seq !== request.seq || entryHash(origin) !== request.hash) return { result: "unavailable", reason: "unavailable" };
  const declared = declarationOf(definition);
  const input = origin.input;
  /** What the origin gives its clauses: its fields, how it selects its items, its primary item by ID, and its signer. */
  let frame: { kind: string; body: BodyStructure | null; fields: Record<string, FieldValue>; fieldTypes: ActType["fields"]; also: Readonly<Record<string, AlsoRule>>; on: number | null; signer: Signer | null;
               presents?: ActType["presents"]; presented?: Readonly<Record<string, FieldValue>>;
               /** The send of an outcome's mark, which made the request: an outcome entry has no written list to find it in. */
               sent?: SendMark };
  if (input.type === "act" || input.type === "genesis") {
    const intent = input.type === "act" ? input.signed.intent : input["founding"]?.intent;
    const kind = input.type === "act" ? input.signed.intent.kind : declared.genesis;
    const act = own(declared.acts, kind)!;
    const given = intent ? intent.fields : input.type === "genesis" && input.source ? creationFields(input.message, input.source, act.fields) : null;
    const read = readFields(act.fields, given ?? {}, context.bounds);
    if (!read.ok) throw new Error(`entry ${origin.seq} was sealed with fields its act does not take`);
    const on = act.step === "open" ? origin.seq : intent?.on;
    // The clause reads the member who signed the origin, and no principal. The entry that records the clause has no signer, so
    // the fold adds no principal for it; a principal here would put a member in an `attribute` effect whom the fold then leaves
    // out of the item's history. A grant is judged for the entry it is presented with, and for no later entry.
    const signed = signerOf(origin);
    const program = namedBody(definition, "act", kind, "act");
    if (!program) throw new TypeError("origin body was not captured by its validation");
    frame = { kind, body: program, fields: read.fields, fieldTypes: act.fields, also: act.also, on: typeof on === "number" ? on : null, signer: signed && { member: signed.member, principal: null } };
    // The facts that were presented beside the origin's intent, which a clause may read as the act's guards did.
    if (input.type === "act") [frame.presents, frame.presented] = [act.presents, input.presented];
  } else if (input.type === "delivery" && (input.message.class === "request" || input.message.class === "advisory")) {
    const b = bound(definition, input.message, input.from, input.sourceKind);
    if (!b?.handler || !b.fields) throw new Error(`entry ${origin.seq} sent a request and ran no handler`);
    const handler = handlerBranch(definition, b.handler, "decision" in input ? input.late : undefined);
    if (!handler) throw new RuleFault(`entry ${origin.seq} names no declared late branch`);
    const read = messageRead(view, scope.at, handler, b.fields, context.bounds);
    if (!read.ok) throw new Error(`entry ${origin.seq} was sealed with fields its handler does not take`);
    // The handler's primary item: the one the origin opened, or the one item of the type that it found.
    const on = handler.opens === null ? null : origin.effects.some((e) => e.effect === "open") ? origin.seq : (ones(view, definition, handler.opens, origin.seq)[0]?.id ?? null);
    const program = handlerBody(definition, handler);
    if (!program) throw new TypeError("origin body was not captured by its validation");
    frame = { kind: b.kind, body: program, fields: read.fields, fieldTypes: handler.fields, also: handler.also, on, signer: null };
  } else if (input.type === "outcome") {
    // Platform data, section 6.1, place 7: an outcome entry has no row in the data. The mark of its kind may hold one `send`, whose
    // clauses are the mark's own (revision 17, "A request of an outcome's rule, and its clauses"). Such an entry sends that one
    // request and no other, at ordinal 0. A request of a kind whose mark holds no send has no clause written anywhere: its result
    // is recorded, and changes nothing. The clause is found by the kind of the outcome, which its input holds, and by nothing else.
    const marked = input.owner === context.platform?.named ? own(nativeOutcomes(definition), input.kind)?.send : undefined;
    if (!marked || request.n !== 0) return { result: "ran", effects: [], uses: [], judgesTime: false };
    // An outcome has no field, no subject and no signer: each effect of the clause is an effect mark, whose rule finds its items.
    frame = { kind: input.kind, body: null, fields: {}, fieldTypes: {}, also: {}, on: null, signer: null, sent: marked as unknown as SendMark };
  } else throw new Error(`entry ${origin.seq} is not one that sends a request`);

  // Match the recorded message against the captured occurrence, then follow its future root.
  const originBody = frame.body;
  const selected = originBody ? sendOrigin(definition, originBody, origin, request.n) : null;
  const form = frame.sent ?? selected?.declaration;
  if (!form || "index" in form) throw new Error(`entry ${origin.seq} declares no request at ordinal ${request.n}`);
  const marked = selected?.node.op === "native" ? selected.node.data : nativeMark(definition, form, "send");
  const written = marked ? null : (form as Exclude<SendForm, { index: unknown }>);
  const clauses = (marked ? marked.result : "create" in written! ? written.create.result : "tell" in written! ? written.tell.result : written!.relate.result) as ResultClauses & { conflict?: readonly EffectForm[] };
  const structure = selected && originBody ? sendClauseStructure(definition, originBody, selected.node, clause)
    : clauseStructure(definition, form, clause, null, frame.kind);
  if ((clauses[clause]?.length ?? 0) > 0 && !structure) throw new TypeError("result clause was not captured by its validation");
  const effectful = structure?.nodes.some(node => node.category === "effect") ?? false;
  // Revision 20, section 16.1: the rows of this clause, for the delivery of a result that runs it, under a definition whose data
  // states rows. A request that a rule gave states none: its mark holds its clauses, and no text gives a mark rows (I3 deltas,
  // entry GA5). A diagnosis holds no observation, so `undelivered` has none.
  const rows = definition.observing && written && beside && given && clause !== "undelivered" ? rowsOfClause(written, clause) : [];
  if (beside && definition.observing) beside.rows = { status: [], listed: new Set(), retained: [], values: [] };
  if (!effectful && rows.length === 0) return { result: "ran", effects: [], uses: [], judgesTime: false };

  // The uses of the origin are the facts its fields name; a clause may read one (section 6.6, a party from a fetched fact).
  // A local fact that the origin's fields name was checked when the origin was judged. It is put in normal form again here.
  // A detached text that the origin's fields name was checked when the origin was judged, and is not asked for again.
  const local = { at: scope.at, own: context.own, texts: () => null };
  const facts = readJudgmentFacts(view, frame.fieldTypes, frame.fields, judgmentFacts(context), local);
  const presented = readJudgmentFacts(view, presentedTypes(frame.presents), frame.presented ?? {}, judgmentFacts(context), local);
  if (facts.result !== "read" || presented.result !== "read") return { result: "unavailable", reason: "dependency-unavailable" };
  // Section 6.6: a clause's subjects are those of the entry that made the send, as that entry resolved them, and they are read as
  // they are now. A name that the origin left unbound stays unbound. The validator lets a clause name no subject that was
  // selected through a slot which may have changed since.
  const subjects = new Map<string, Item>();
  const on = frame.on === null ? null : view.item(frame.on);
  const also = alsoItems(view, definition, frame.also, facts.fields, on, origin.seq);
  if ((frame.on !== null && !on) || !also.ok) throw new Error(`entry ${origin.seq} names an item that does not exist`);
  if (on) subjects.set("on", on);
  for (const [name, item] of also.items) subjects.set(`also.${name}`, item);
  // Section 6.6: a clause of a fan-out send reads `each`, the item of that send. The validator lets a clause read it only where the
  // update's `item` is that item, so the send that the origin recorded names it.
  const update = written && "relate" in written && written.relate.each ? updateOf(origin.sends.find((s) => s.n === request.n)!.message as Request, { at: scope.at, seq: origin.seq, hash: request.hash }) : null;
  const j: Judging = {
    view, definition, bounds: context.bounds, clock: context.clock, scope, self: scope.head.seq + 1, kind: frame.kind, fields: facts.fields, fieldTypes: frame.fieldTypes, subjects, signer: frame.signer,
    facts: new Map([...facts.facts, ...presented.facts]), prepared: [], used: [], own: context.own, sender: answered?.sender, result: answered?.reason, each: (update && view.item(update.item.seq)) ?? undefined,
    presented: presented.fields, capabilities: context.capabilities, platform: context.platform, judged, ran: { clock: false }, beside,
    // The clause of an outcome's send has no field that names a fact. Its rule may give the fact of the entry that answered, which
    // is at hand as the verified source entry of the result, and which the entry that records the result retains.
    ...(frame.sent && (answered?.source || assumedSource(context)) ? { source: answered?.source ? verifiedCopy(answered.source) : assumedSource(context)! } : {}),
  };
  // Section 16.1, "In the commit": for a clause the list is derived before any rule of the entry runs. A source reads what a clause
  // reads: the state as it is now, the fields and the facts of the entry that sent the request, and the result. A member of another
  // repository is left out. A subject with no observation at hand, which the scope can still read, stops the commit. An absent row
  // that states `wait` leaves the result not recorded now: the delivery is tried again. Every other absent row, and every row that
  // is over, is told to the rule, and the entry is written.
  let settled: Settled | undefined;
  if (rows.length > 0 && beside && given) {
    const list = listedBy(j, rows, given.observing?.membership).rows;
    settled = settle(list, { view, bounds: context.bounds, clock: context.clock, ...given });
    if (settled.missing.length > 0) return { result: "unavailable", reason: "authority-unavailable", missing: settled.missing, rows: settled };
    if (waits(list, settled)) return { result: "unavailable", reason: "authority-unavailable", rows: settled };
    const { status } = settled;
    beside.rows = { status: rows.map((_, n) => status.get(n) ?? null), listed: settled.listed, retained: settled.retained, values: settled.values };
  }
  const ran = executeBody(j, structure, request.hash);
  // Section 6.6: a clause's condition that is not completed leaves the result not recorded now. It is offered again.
  if (ran.result === "unavailable") return ran;
  // Section 6.3: `max` bounds the live items of a type, whatever opens the item. In platform data a rule of the clause may open
  // one. Past the bound the clause's effects cannot apply now, and it changes nothing, as above.
  return { result: "ran", effects: ran.result === "ran" ? sequenceEffects(ran.effects) : [], uses: [...facts.uses, ...presented.uses.filter((use) => !facts.facts.has(use.fact.hash))], judgesTime: ran.result === "ran" ? ran.judgesTime : (structure !== null && bodyJudgesClock(structure)) || j.ran?.clock === true, ...(settled ? { rows: settled } : {}) };
}
