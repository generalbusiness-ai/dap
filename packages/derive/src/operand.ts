/**
 * Operands and parts (scope contract, sections 6.2 and 6.5): what a guard,
 * an effect or a send reads, and what a part reads inside an entry that a
 * fact reference names. Every value is read from what section 5.1 allows:
 * the input's own bytes, this scope's state and history, and entries that
 * were fetched by hash before the turn. An operand that reads nothing is
 * none, which is `null` here. A part is never an error.
 */

import type { ActType, Digest, Entry, EntryPart, FactRef, FactUse, FieldRecord, FieldType, FieldValue, GenesisSelfRef, Operand, Part, ScopeKind, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalBytes, canonicalize, digestBytes, intentDigest, isEntry, isEntryBodyOf, isScopeKind, isSequenceRef, messageDigest, parseStrict, platformName, scopeIdOf, isSeed, utf8 } from "@generalbusiness/dap-bytes";
import { creationFields, isEntryOf, isLocalFact, useOf, type Facts, type Local, type Reading } from "./fields.ts";
import { bound } from "./handlers.ts";
import { declarationOf } from "./program/declaration.ts";
import type { AnchoredJudgmentCopy, Fetched, Judging, ReplayAssumptions, RetainedResultMaterial, RetainedResultOperand } from "./guards.ts";
import type { Item, StateView } from "./state.ts";
import { byteOrder, isFactRef, isLocalId, isObject, memberOf, own, same } from "./values.ts";
import { answersCatalogVocabularyQuestion } from "@generalbusiness/dap-contract/catalog-vocabulary";
import { archivedPosition } from "./floor.ts";
import { RuleFault } from "./marks.ts";
import type { Source, Delivered, DeliveryContext } from "./delivery.ts";
import type { Creation, SignedCreation } from "./genesis.ts";
import { inspectClassifiedRetainedUse, isRetainedUse, type RetainedUse } from "./retained-use.ts";

// The runtime's native clone snapshots admitted JSON without another parser.
declare function structuredClone<T>(value: T): T;

/** Internal evidence arms. Only a Replay adapter installs caller copies. */
type RecordedCopy = AnchoredJudgmentCopy & { readonly kind: ScopeKind };
const CONSTRUCT = Symbol("judgment-context-construction");
class LocalRetainedCopy {
  readonly #use: RetainedUse;
  readonly mode = "local-retained" as const;
  readonly under: string;
  constructor(token: unknown, use: RetainedUse, under: string) {
    if (token !== CONSTRUCT || !isRetainedUse(use)) throw new TypeError("local judgment copy requires its original retained use");
    this.#use = use;
    this.under = under;
    Object.freeze(this);
  }
  get fact(): FactRef { return this.#use.fact; }
  get entry(): Entry { return this.#use.entry; }
  get kind(): ScopeKind { return this.#use.kind; }
  static is(value: unknown): value is LocalRetainedCopy { return typeof value === "object" && value !== null && #use in value; }
}
Object.freeze(LocalRetainedCopy.prototype); Object.freeze(LocalRetainedCopy);
export type JudgmentCopy = { readonly mode: "verified"; readonly value: Fetched } | RecordedCopy | LocalRetainedCopy;
const localCopy = (copy: LocalRetainedCopy): LocalRetainedCopy => {
  if (!LocalRetainedCopy.is(copy)) throw new RuleFault("local judgment copy requires private ownership");
  return copy;
};
export function verifiedCopy(value: Fetched): Extract<JudgmentCopy, { mode: "verified" }> {
  if (!isEntryOf(value.entry, value.fact, value.sequence)) throw new RuleFault("a verified judgment copy requires genuine matching genesis evidence");
  return { mode: "verified", value };
}
export const copyFact = (copy: JudgmentCopy): FactRef => copy.mode === "verified" ? copy.value.fact : copy.mode === "local-retained" ? localCopy(copy).fact : copy.fact;
export const copyEntry = (copy: JudgmentCopy): Entry => copy.mode === "verified" ? copy.value.entry : copy.mode === "local-retained" ? localCopy(copy).entry : copy.entry;
export const copyUnder = (copy: JudgmentCopy): string => copy.mode === "verified" ? copy.value.under
  : copy.mode === "local-retained" ? localCopy(copy).under : copy.mode === "retained-name" ? copy.under : platformName(copy.exporterRow.pin);
export const copyKind = (copy: JudgmentCopy): ScopeKind => copy.mode === "verified" ? copy.value.sequence.kind : copy.mode === "local-retained" ? localCopy(copy).kind : copy.kind;

/** Full matching always precedes hash deduplication, including in the caller arm. */
export function matchesCopy(copy: JudgmentCopy, fact: FactRef): boolean {
  try {
    if (copy.mode === "verified") return same(copy.value.fact, fact) && isEntryOf(copy.value.entry, fact, copy.value.sequence);
    if (copy.mode === "local-retained") return LocalRetainedCopy.is(copy) && same(copy.fact, fact) && isEntryBodyOf(copy.entry, fact);
    const { entry, anchor } = copy;
    const body = same(copy.fact, fact) && entry.input.type !== "genesis" && isEntryBodyOf(entry, fact)
      && canonicalize(entry) === copy.originalBytes
      && anchor.scope === fact.at.scope && anchor.seq === fact.seq && anchor.hash === fact.hash;
    if (!body) return false;
    if (copy.mode === "retained-name") return isScopeKind(copy.kind) && typeof copy.under === "string";
    if (copy.mode !== "caller-anchor") return false;
    const { exporterRow } = copy;
    const privatePin = copy.kind === "register" ? answersCatalogVocabularyQuestion(exporterRow.pin, "archiveRegisterForeignCopy")
      : copy.kind === "membership" && answersCatalogVocabularyQuestion(exporterRow.pin, "archiveMembershipForeignCopy");
    return same(exporterRow.at, fact.at) && privatePin;
  } catch { return false; }
}

const EVIDENCE = Symbol("per-judgment-evidence");
type RuntimeAsked = { act: SignedIntent } | { delivery: Delivered } | { genesis: Creation | SignedCreation };
type EvidencePhase = "live-verified" | "live-result-pending" | "live-result-admitted" | "replay";
interface EvidenceData {
  readonly phase: EvidencePhase;
  readonly asked: Digest | null;
  readonly valid: boolean;
  readonly own: Reading["own"];
  readonly material: RetainedResultMaterial | null;
  readonly sourceInput: Source | null;
  readonly sourcePin: Digest | null;
  readonly facts: readonly JudgmentCopy[];
  readonly source: JudgmentCopy | null;
  readonly recorded?: Entry;
}
class ContextEvidence {
  readonly #holder: Reading;
  readonly #data: EvidenceData;
  constructor(token: unknown, holder: Reading, data: EvidenceData) {
    if (token !== CONSTRUCT) throw new TypeError("judgment evidence requires its owned holder");
    this.#holder = holder; this.#data = Object.freeze(data); Object.freeze(this);
  }
  static for(holder: Reading): EvidenceData | null {
    const value: unknown = Object.getOwnPropertyDescriptor(holder, EVIDENCE)?.value;
    return typeof value === "object" && value !== null && #holder in value && value.#holder === holder ? value.#data : null;
  }
}
Object.freeze(ContextEvidence.prototype); Object.freeze(ContextEvidence);

function fingerprint(value: unknown): Digest | null {
  // Only canonical input binding can fail here; no port/body operation runs.
  try { return digestBytes(canonicalBytes(value)); } catch { return null; }
}
function ownContext<C extends Reading>(context: C, data: EvidenceData): C {
  const holder = { ...context };
  Object.defineProperty(holder, EVIDENCE, { value: new ContextEvidence(CONSTRUCT, holder, { ...data, facts: Object.freeze([...data.facts]) }), enumerable: true });
  Object.freeze(holder);
  return holder;
}
// A fetched list with a copy that is not its entry stages no copies. The fact readers then answer
// `dependency-unavailable` for it (`readFacts`), as for a fact that was not fetched.
function verifiedData(context: Reading, actual: RuntimeAsked): EvidenceData {
  const genuine = context.facts.every((value) => isEntryOf(value.entry, value.fact, value.sequence));
  return { phase: "live-verified", asked: fingerprint(actual), valid: true, own: context.own,
    material: null, sourceInput: null, sourcePin: null, facts: Object.freeze(genuine ? context.facts.map(verifiedCopy) : []), source: null };
}
const resultAsked = (actual: RuntimeAsked): actual is { delivery: Delivered } => "delivery" in actual && isObject(actual.delivery.message) && actual.delivery.message.class === "result";
const retainedPhase = (phase: EvidencePhase): boolean => phase === "live-result-pending" || phase === "live-result-admitted";

function stagedMaterial(material: RetainedResultMaterial | null): RetainedResultMaterial | null {
  if (!material || !isObject(material.origin) || !Array.isArray(material.operands)) return null;
  const operands: RetainedResultOperand[] = [];
  for (const operand of material.operands) {
    if (!isObject(operand) || typeof operand["under"] !== "string") return null;
    operands.push(Object.freeze({ classified: operand["classified"], under: operand["under"] }));
  }
  return Object.freeze({ localSequence: material.localSequence,
    origin: Object.freeze({ entry: material.origin.entry, hash: material.origin.hash }), operands: Object.freeze(operands) });
}

/** Stage existing material only. Failure cannot replace an earlier delivery answer. */
export function retainedResultContext(base: Omit<DeliveryContext, "facts" | "origin">, actual: Delivered, material: RetainedResultMaterial | null): DeliveryContext {
  const source = base.source ? Object.freeze({ ...base.source }) : null;
  const staged = stagedMaterial(material);
  const context: DeliveryContext = { ...base, clock: Object.freeze({ ...base.clock }), bounds: Object.freeze({ ...base.bounds }),
    facts: Object.freeze([]), source, origin: staged?.origin.entry ?? null };
  const asked = fingerprint({ delivery: actual });
  return ownContext(context, { phase: "live-result-pending", asked, valid: asked !== null,
    own: context.own, material: staged, sourceInput: source, sourcePin: fingerprint(source?.pin ?? null), facts: [], source: null });
}

/** A new live invocation re-stages an admitted result; no earlier admission is a lease. */
export function verifiedContext<C extends Reading>(context: C, actual: RuntimeAsked): C {
  const previous = ContextEvidence.for(context);
  if (previous && retainedPhase(previous.phase) && resultAsked(actual)) {
    const asked = fingerprint(actual);
    const valid = previous.valid && asked !== null && asked === previous.asked && previous.own === context.own;
    return ownContext({ ...context, facts: [] }, { ...previous, phase: "live-result-pending", asked, valid,
      material: valid ? previous.material : null, facts: [], source: null });
  }
  return ownContext(context, verifiedData(context, actual));
}

/** The collector changes exactly two fields and never admits pending operands. */
export function resultContextForRuleCollection(context: DeliveryContext, actual: Delivered, asked: import("./guards.ts").RuleInput[]): DeliveryContext {
  const previous = ContextEvidence.for(context), collecting = { ...context, prepared: [], asked };
  if (!previous || !retainedPhase(previous.phase)) return collecting;
  const bound = fingerprint({ delivery: actual });
  const valid = previous.valid && bound !== null && bound === previous.asked && previous.own === context.own;
  return ownContext({ ...collecting, facts: Object.freeze([]) }, { ...previous, phase: "live-result-pending", valid, material: valid ? previous.material : null, facts: [], source: null });
}

/** The only runtime body admission, after the existing result/repeat guards. */
export function admitRetainedResultContext(context: DeliveryContext, actual: Delivered, receiving: ScopeRef): DeliveryContext | null {
  const evidence = ContextEvidence.for(context);
  if (!evidence) return Object.getOwnPropertyDescriptor(context, EVIDENCE) ? null : context;
  if (!retainedPhase(evidence.phase)) return context;
  const material = evidence.material, message = actual.message, source = context.source;
  if (!evidence.valid || evidence.own !== context.own || fingerprint({ delivery: actual }) !== evidence.asked
    || !material || message.class !== "result" || !isObject(message.of) || !isFactRef(message.of.from) || !isLocalId(message.of.n)
    || !same(message.of.from.at, receiving) || !isEntry(material.origin.entry)
    || material.origin.hash !== message.of.from.hash || !isEntryOf(material.origin.entry, message.of.from, material.localSequence)
    || !same(material.localSequence.at, receiving) || material.origin.entry.input.type === "genesis" && material.localSequence.kind !== material.origin.entry.input.seed.kind) return null;
  if (source !== evidence.sourceInput || !source || !evidence.source || evidence.source.mode !== "verified"
    || evidence.source.value.entry !== source.entry || evidence.source.value.sequence !== source.sequence || evidence.source.value.under !== source.under
    || !matchesCopy(evidence.source, actual.from) || evidence.sourcePin === null || fingerprint(source.pin ?? null) !== evidence.sourcePin) return null;
  const sent = material.origin.entry.sends.find(send => send.n === message.of.n);
  if (!sent || sent.message.class !== "request") return null;
  const target = isSequenceRef(sent.to) ? same(sent.to, actual.from.at)
    : isSeed(sent.to) && scopeIdOf(sent.to) === actual.from.at.scope && sent.to.kind === evidence.source.value.sequence.kind;
  if (!target) return null;
  if (material.operands.length !== material.origin.entry.uses.length) return null;
  const facts: JudgmentCopy[] = [], genuine: Fetched[] = [];
  for (let index = 0; index < material.operands.length; index++) {
    const operand = material.operands[index]!, classified = inspectClassifiedRetainedUse(operand.classified), use = material.origin.entry.uses[index]!;
    if (!classified || typeof operand.under !== "string" || classified.use.useIndex !== index || !same(classified.use.origin, message.of.from)
      || !same(classified.use.fact, use.fact) || classified.use.content !== use.content || classified.use.kind !== use.kind) return null;
    if (classified.mode === "genuine") {
      const value: Fetched = { fact: classified.use.fact, entry: classified.use.entry, sequence: classified.sequence, under: operand.under };
      genuine.push(value); facts.push(verifiedCopy(value));
    } else facts.push(new LocalRetainedCopy(CONSTRUCT, classified.use, operand.under));
  }
  return ownContext({ ...context, facts: Object.freeze(genuine) }, { ...evidence, phase: "live-result-admitted", facts: Object.freeze(facts) });
}

/** Take owned snapshots before any rule can run or state view can change. */
type ReplayAsked = RuntimeAsked;
export function replayContext<C extends Reading & { source?: Source | null }>(context: C, assumed: ReplayAssumptions, asked: ReplayAsked): C | null {
  if (!assumed || !Array.isArray(assumed.facts) || context.source && assumed.source || !isEntry(assumed.recorded)) return null;
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const member of Object.values(value)) freeze(member);
    Object.freeze(value);
  };
  // Only input and use metadata can choose a recorded kind. Copy them before
  // a state/rule callback runs; the other entry members are not consulted.
  const recorded = { ...assumed.recorded };
  recorded.input = structuredClone(recorded.input);
  recorded.uses = structuredClone(recorded.uses);
  freeze(recorded.input); freeze(recorded.uses); Object.freeze(recorded);
  const input = recorded.input;
  if ("act" in asked) {
    if (input.type !== "act" || !same(input.signed, asked.act)) return null;
  } else if ("delivery" in asked) {
    if (input.type !== "delivery" || !same(input.from, asked.delivery.from) || input.n !== asked.delivery.n || !same(input.message, asked.delivery.message)) return null;
  } else {
    const birth = asked.genesis;
    const seed = "creation" in birth ? birth.seed : birth.to;
    if (input.type !== "genesis" || !same(input.seed, seed) || input.nonce !== birth.nonce) return null;
    if ("creation" in birth ? input.source !== null || !same(input.founding, birth.creation)
      : !same(input.source, birth.from) || input.n !== birth.n || !same(input.message, birth.message)) return null;
  }
  const kinds = new Map<string, ScopeKind>();
  const remember = (fact: FactRef, kind: ScopeKind): boolean => {
    const key = canonicalize(fact.at), previous = kinds.get(key);
    if (!isScopeKind(kind)) return false;
    if (previous !== undefined && previous !== kind) throw new RuleFault("the receiving entry records contradictory kinds for one sequence");
    kinds.set(key, kind); return true;
  };
  for (const use of recorded.uses) if (!remember(use.fact, use.kind)) return null;
  const sourceFact = input.type === "delivery" ? input.from : input.type === "genesis" ? input.source : null;
  const sourceKind = input.type === "delivery" || input.type === "genesis" ? input.sourceKind : null;
  if (sourceFact && (sourceKind === null || !remember(sourceFact, sourceKind))) return null;
  for (const value of context.facts) {
    if (!isEntryOf(value.entry, value.fact, value.sequence)) return null;
    const kind = kinds.get(canonicalize(value.fact.at));
    if (kind !== undefined && value.sequence.kind !== kind) throw new RuleFault("the receiving entry's recorded kind differs from the verified genesis");
  }
  // The actual source is not required to appear a second time in facts (F1).
  if (context.source) {
    if (!sourceFact || !isEntryOf(context.source.entry, sourceFact, context.source.sequence)) return null;
    const kind = kinds.get(canonicalize(context.source.sequence.at));
    if (kind !== undefined && context.source.sequence.kind !== kind) throw new RuleFault("the receiving entry's sourceKind differs from the separately verified source genesis");
  }
  const kindFor = (fact: FactRef, source: boolean): ScopeKind | null => {
    if (source) return sourceFact && same(sourceFact, fact) ? sourceKind : null;
    return recorded.uses.find(use => same(use.fact, fact))?.kind ?? null;
  };
  const snapshot = (copy: AnchoredJudgmentCopy, source: boolean): RecordedCopy | null => {
    try {
      const closed = (value: unknown, keys: readonly string[]): boolean => isObject(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
      const basis = copy.mode === "caller-anchor"
        ? closed(copy, ["mode", "fact", "entry", "originalBytes", "anchor", "exporterRow"]) && closed(copy.exporterRow, ["at", "pin"])
        : copy.mode === "retained-name" && closed(copy, ["mode", "fact", "entry", "originalBytes", "anchor", "under"]) && typeof copy.under === "string";
      if (!basis || !closed(copy.anchor, ["scope", "seq", "hash"])
        || typeof copy.originalBytes !== "string" || copy.originalBytes.length > context.bounds.entryBytes || utf8(copy.originalBytes).length > context.bounds.entryBytes) return null;
      const entry: unknown = parseStrict(copy.originalBytes);
      if (!isEntry(entry)) return null;
      const kind = kindFor(copy.fact, source);
      if (kind === null) return null;
      const body = { fact: { at: { ...copy.fact.at }, seq: copy.fact.seq, hash: copy.fact.hash }, entry,
        originalBytes: copy.originalBytes, anchor: { ...copy.anchor }, kind };
      const owned: RecordedCopy = copy.mode === "caller-anchor"
        ? { ...body, mode: "caller-anchor", exporterRow: { at: { ...copy.exporterRow.at }, pin: copy.exporterRow.pin } }
        : { ...body, mode: "retained-name", under: copy.under };
      if (!same(copy.entry, entry) || !matchesCopy(owned, owned.fact)) return null;
      freeze(owned);
      return owned;
    } catch { return null; }
  };
  const facts: JudgmentCopy[] = context.facts.map(verifiedCopy);
  for (const copy of assumed.facts) {
    const owned = snapshot(copy, false);
    if (!owned) return null;
    // A real genesis admission must agree with the recorded word and alias basis.
    const verified = context.facts.find(value => same(value.fact.at, owned.fact.at));
    if (verified && (verified.sequence.kind !== owned.kind || verified.under !== copyUnder(owned))) return null;
    if (context.source && same(context.source.sequence.at, owned.fact.at) && (context.source.sequence.kind !== owned.kind || context.source.under !== copyUnder(owned))) return null;
    facts.push(owned);
  }
  const source = assumed.source ? snapshot(assumed.source, true) : null;
  if (assumed.source && !source) return null;
  if (source) {
    const verified = context.facts.find(value => same(value.fact.at, source.fact.at));
    if (verified && (verified.sequence.kind !== source.kind || verified.under !== copyUnder(source))) return null;
  }
  return ownContext(context, { phase: "replay", asked: fingerprint(asked), valid: true, own: context.own, material: null,
    sourceInput: context.source ?? null, sourcePin: fingerprint(context.source?.pin ?? null), facts: Object.freeze(facts), source, recorded });
}

export const judgmentFacts = (context: Reading): readonly JudgmentCopy[] => ContextEvidence.for(context)?.facts ?? context.facts.map(verifiedCopy);
export function replayAssumptions(context: Reading): ReplayAssumptions | null {
  const owned = ContextEvidence.for(context);
  const recorded = owned?.phase === "replay" ? owned.recorded : undefined;
  if (!recorded) return null;
  const source = assumedSource(context);
  // Public copies have no kind slot; derive it again from the same record.
  const copyOf = ({ kind: _kind, ...copy }: RecordedCopy): AnchoredJudgmentCopy => copy;
  return { recorded, facts: judgmentFacts(context).flatMap(copy => copy.mode === "caller-anchor" || copy.mode === "retained-name" ? [copyOf(copy)] : []), source: source && (source.mode === "caller-anchor" || source.mode === "retained-name") ? copyOf(source) : null };
}
export const assumedSource = (context: Reading): JudgmentCopy | null => ContextEvidence.for(context)?.source ?? null;
export function sourceCopy(context: Reading & { source: Source | null }, fact: FactRef): JudgmentCopy | null {
  const source = context.source;
  return source ? verifiedCopy({ fact, entry: source.entry, sequence: source.sequence, under: source.under }) : assumedSource(context);
}

/** Private per-call continuation; public Reading/Source never acquire an assumed member. */
export function withJudgmentSource<C extends Reading & { source?: Source | null }>(context: C, actual: { delivery: Delivered } | { genesis: Creation }, source: JudgmentCopy): C {
  const previous = ContextEvidence.for(context);
  if (!previous) throw new RuleFault("source continuation requires its owned context");
  const asked = fingerprint(actual);
  // Child genesis and delivery install only sourceCopy's actual checked source.
  const from = "delivery" in actual ? actual.delivery.from : actual.genesis.from;
  const input = context.source ?? null;
  const checkedSource = source.mode === "verified" && input !== null
    && source.value.entry === input.entry && source.value.sequence === input.sequence && source.value.under === input.under
    && matchesCopy(source, from);
  const sameSource = previous.phase === "replay" ? source === previous.source || checkedSource : checkedSource;
  if (!sameSource) throw new RuleFault("source continuation requires the actual checked source");
  const valid = previous.valid && asked !== null && asked === previous.asked && previous.own === context.own;
  return ownContext(context, { ...previous, valid, material: valid ? previous.material : null, source });
}

export function sentByCopy(copy: JudgmentCopy, delivered: Delivered): boolean {
  try {
    const send = matchesCopy(copy, delivered.from) ? copyEntry(copy).sends.find(value => value.n === delivered.n) : undefined;
    return !!send && same(send.to, delivered.to) && messageDigest(send.message) === messageDigest(delivered.message);
  } catch { return false; }
}

/** Shared field walk; the public readFacts wrapper supplies only verified arms. */
type JudgmentFacts<C extends JudgmentCopy> = Exclude<Facts, { result: "read" }> | { result: "read"; fields: Record<string, FieldValue>; facts: Map<Digest, C>; uses: FactUse[] };
function leaves(type: FieldType, value: FieldValue): [FieldType, FieldValue][] {
  if (type.type === "list") return (value as readonly FieldValue[]).flatMap(member => leaves(type.of, member));
  if (type.type !== "record") return [[type, value]];
  return Object.entries(type.of).flatMap(([name, of]) => {
    const member = own(value as FieldRecord, name);
    return member === undefined ? [] : leaves(of, member);
  });
}

export function readJudgmentFacts<C extends JudgmentCopy>(view: StateView, types: ActType["fields"], fields: Readonly<Record<string, FieldValue>>, available: readonly C[], local: Local): JudgmentFacts<C> {
  const facts = new Map<Digest, C>();
  const uses: FactUse[] = [];
  for (const name of Object.keys(fields).sort(byteOrder)) {
    // A field with no declared type, as a handler's message has, names no item and no fact here.
    const declared = own(types, name);
    if (!declared) continue;
    for (const [type, value] of leaves(declared, fields[name]!)) {
      if (type.type === "item" && view.item(value as number)?.type !== type.of) return { result: "no-item", detail: `${name} names no ${type.of}`, uses };
      if (type.type === "text" && type.detached) {
        if (!local.texts) return { result: "unavailable" };
        const size = local.texts(value as Digest);
        if (size === undefined) return { result: "bad-field", detail: `${name} names a text that did not come with the input, or whose bytes its digest does not name`, uses };
        if (size !== null && size > type.max) return { result: "bad-field", detail: `${name} names a text of ${size} bytes; at most ${type.max}`, uses };
        if (size === null && local.texts.redactedOver?.(value as Digest, type.max)) return { result: "bad-field", detail: `${name}'s refusal depends on its unavailable original text size`, uses };
      }
      if (type.type !== "fact") continue;
      const ref = value as FactRef;
      if (isLocalFact(ref, local.at)) {
        if (archivedPosition(view, ref.seq)) return { result: "archived", detail: `${name} names archived entry ${ref.seq}`, uses };
        if (!local.own) return { result: "unavailable" };
        const sequence = local.own.sequence();
        if (!sequence) return { result: "unavailable" };
        const kept = local.own(ref.seq);
        if (!kept || kept.hash !== ref.hash || !isEntryOf(kept.entry, ref, sequence)) return { result: "fact-mismatch", detail: `${name} names no entry of this scope: entry ${ref.seq} has another hash, or does not exist`, uses };
        continue;
      }
      const fetched = available.find((f) => same(copyFact(f), ref));
      // Section 5.2, step 1: a foreign entry that was not fetched, or is not the entry the reference names, is a dependency that is not available.
      if (!fetched || !matchesCopy(fetched, ref)) return { result: "unavailable" };
      if (facts.has(ref.hash)) continue;
      facts.set(ref.hash, fetched);
      uses.push(useOf(ref, copyEntry(fetched), copyKind(fetched)));
    }
  }
  // Each local fact as its `seq`: every one was checked above. Every other value as it is. Only a declared field of type fact holds one, or a list or a record with one.
  const inNormalForm = (type: FieldType | undefined, value: FieldValue): FieldValue => {
    if (type?.type === "list") return (value as readonly FieldValue[]).map((v) => inNormalForm(type.of, v));
    if (type?.type === "record") return Object.fromEntries(Object.entries(value as FieldRecord).map(([name, member]) => [name, inNormalForm(own(type.of, name), member)]));
    return type?.type === "fact" && isLocalFact(value as FactRef, local.at) ? (value as FactRef).seq : value;
  };
  return { result: "read", fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, inNormalForm(own(types, name), value)])), facts, uses };
}

/** What a slot holds, or null. An empty list is unset. */
export function slotOf(item: Item, slot: string): FieldValue | null {
  const v = own(item.parties, slot) ?? own(item.refs, slot) ?? own(item.values, slot) ?? null;
  return Array.isArray(v) && v.length === 0 ? null : (v as FieldValue | null);
}

// ---------------------------------------------------------------- the kind of an entry (section 6.2)

/**
 * The kind that a `fact` type's `kind` is compared with: the act kind of an
 * act; the genesis act's kind of a genesis; `timed:` and its rule's key of a
 * timed entry; and, for a delivery of a request that a handler received,
 * the handler's message name, which for a relationship update is the
 * relationship's name. Null: the entry has no kind that is derived here.
 *
 * A request that no handler of its receiver's definition receives is decided
 * `refused`, `unknown-message`. Its entry has no kind: the name in it is the
 * sender's choice, and could be an act kind of this definition, or `timed:`
 * and a rule's key. The decision is in the entry's bytes, so a reader that
 * does not hold the receiver's definition reads it too.
 *
 * A genesis entry holds its act's kind, as the member `kind` of its input
 * (section 4.1). Every reader reads it there, for this scope's own genesis
 * and for the genesis of a scope under any other definition. A reader that
 * does not hold the foreign definition cannot check the value: it relies on
 * the foreign scope's judge, as for every other member of a fetched entry.
 * The kind does not name the definition. The `under` check does that.
 *
 * A preparation entry has the kind of its capability and its step, written
 * `hold@1:check`, which its input holds (section 6.2, "Which entries have a
 * kind, exactly"). No act kind and no message name has that form, so only
 * the capability's code writes an entry of such a kind.
 *
 * An outcome entry has the kind of its operation's owner and kind, written
 * `hold@1:check`, from the members `owner` and `kind` of its input, whatever
 * its result (section 6.2, the row made exact in revision 16; section 4.1,
 * "An outcome states its owner and its kind"). The judge set both from the
 * `operation` effect that opened the operation, so a reader of one fetched
 * entry needs no table of the capability. The kind says nothing of the
 * result: a row that needs a completed check reads the carried record.
 */
export function kindOf(entry: Entry): string | null {
  const input = entry.input;
  if (input.type === "act") return input.signed.intent.kind;
  if (input.type === "genesis") return input.kind;
  if (input.type === "timed") return `timed:${input.rule}`;
  if (input.type === "preparation") return `${input.capability}:${input.step}`;
  if (input.type === "outcome") return `${input.owner}:${input.kind}`;
  if (input.type !== "delivery" || input.message.class !== "request" || !("decision" in input)) return null;
  if (input.decision === "refused" && input.reason?.code === "unknown-message") return null;
  const body = input.message.body;
  if (!isObject(body)) return null;
  const name = input.message.type === "tell" ? body["message"] : input.message.type === "relate" ? body["name"] : null;
  return typeof name === "string" ? name : null;
}

// ---------------------------------------------------------------- an entry that a fact reference names

/** A fact reference as an operand holds it: a foreign fact, or a local entry reference, which is a `seq` of this scope. */
type Held = FactRef | number;

/**
 * The entry a fact reference names, with whether it is this scope's own.
 * Null: its bytes are not at hand. A foreign entry is at hand when the input
 * named it, so that it was fetched and verified whole: a fact field, or the
 * source entry of a delivery. A local entry is read from this scope's own
 * history. A foreign fact that names this scope and was not put in normal
 * form, as in a message's undeclared field, is read from that history only
 * when the history has that hash at that position.
 */
function entryOf(j: Judging, ref: Held): { entry: Entry; local: boolean } | null {
  if (typeof ref === "number") {
    const kept = j.own?.(ref);
    const sequence = j.own?.sequence();
    return kept && sequence && isSequenceRef(j.scope.at) && isEntryOf(kept.entry, { at: j.scope.at, seq: ref, hash: kept.hash }, sequence)
      ? { entry: kept.entry, local: true } : null;
  }
  if (isLocalFact(ref, j.scope.at)) {
    const kept = j.own?.(ref.seq);
    const sequence = j.own?.sequence();
    return kept && sequence && kept.hash === ref.hash && isEntryOf(kept.entry, ref, sequence) ? { entry: kept.entry, local: true } : null;
  }
  const fetched = j.source && same(copyFact(j.source), ref) ? j.source : j.facts.get(ref.hash);
  return fetched && matchesCopy(fetched, ref) ? { entry: copyEntry(fetched), local: false } : null;
}

/** The effects of an entry on one item of its own scope, by local ID. An effect on the item an entry opens names it by the entry's `seq`. */
const effectsOn = (entry: Entry, item: unknown) => entry.effects.filter((e) => "item" in e && e.item === item);

/**
 * What an entry's own effects gave one slot of one item, or its state. Null
 * when no effect of the entry set it. A party list is the list of the members
 * that the entry's effects left in it, in the order of the effects.
 */
function given(entry: Entry, item: unknown, slot: string): unknown {
  let value: unknown = null;
  for (const e of effectsOn(entry, item)) {
    if (slot === "state") { if (e.effect === "open" || e.effect === "state") value = e.state; }
    else if (!("slot" in e) || e.slot !== slot) continue;
    else if (e.effect === "party") value = e.member;
    else if (e.effect === "ref") value = e.to;
    else if (e.effect === "value") value = e.value;
    else if (e.effect === "list") {
      const list = Array.isArray(value) ? value.filter((m) => !same(m, e.member)) : [];
      value = e.change === "add" ? [...list, e.member] : list;
    }
  }
  return Array.isArray(value) && value.length === 0 ? null : value;
}

/**
 * A field of the entry's intent, or of the message it delivered. A genesis
 * has the fields of its signed creation intent, or of its creator's request.
 *
 * The rule: a field is read as the scope that wrote the entry holds it, and
 * never through a declaration of another scope. `local`: the entry is this
 * scope's own, so this scope's definition is the one that admitted it, and a
 * message's fields are read by the types of the handler that received them.
 * A foreign entry was fetched and checked against the hash in its reference.
 * Its reader knows its bytes, its kind and the name of its definition, and
 * does not hold that definition. A handler or a genesis act of the reader's
 * own with the same name says nothing about it. So a field of a foreign
 * entry is the value that the entry's bytes hold, with no type applied:
 *
 * - of an act or a genesis with no creator, the field of the signed intent;
 * - of a delivered request, the field of the message as it was sent: the
 *   `fields` of a `tell`, and the `detail` of a `relate`;
 * - of a child genesis, the field of the creator's request as it was sent.
 *
 * A message as it was sent holds the mark `{ "self": true }` where its sender
 * named the entry it was writing (section 6.6). The bytes do not tell that
 * mark from a record with a member `self`: only the receiver's declared type
 * does. So the mark is not resolved in a foreign entry. It is read as that
 * record, which equals no fact reference. A reference to an earlier entry
 * is whole in the bytes, and is read whole.
 *
 * A request of this scope's own history that no handler received, which was
 * decided `unknown-message`, is read in the same way: no declaration of this
 * scope admitted its fields, as none gave it a kind (`kindOf`).
 */
function fieldOf(j: Judging, entry: Entry, local: boolean, name: string): unknown {
  const input = entry.input;
  if (input.type === "act") return own(input.signed.intent.fields, name) ?? null;
  if (input.type === "genesis" && input["founding"]) return own(input["founding"].intent.fields, name) ?? null;
  const message = input.type === "genesis" ? input.message : input.type === "delivery" && input.message.class === "request" ? input.message : null;
  const body = message?.body;
  if (!message || !isObject(body)) return null;
  const unread = input.type === "delivery" && "decision" in input && input.decision === "refused" && input.reason?.code === "unknown-message";
  if (!local || unread) {
    const sent = message.type === "relate" ? body["detail"] : body["fields"];
    return isObject(sent) ? (own(sent, name) ?? null) : null;
  }
  if (input.type === "genesis") {
    const declared = declarationOf(j.definition);
    return own(input.source ? creationFields(message, input.source, own(declared.acts, declared.genesis)!.fields) : null, name) ?? null;
  }
  if (input.type !== "delivery") return null;
  return own(bound(j.definition, message, input.from, input.sourceKind)?.fields ?? null, name) ?? null;
}

/** Runtime leaf arguments. The lazy item read is never stored in an admitted graph. */
type EntryWord = Extract<EntryPart, string>;
export type EntrySelection = { [K in EntryWord]: { readonly op: K } }[EntryWord]
  | { readonly op: "field" | "opened" | "carried"; readonly name: string }
  | { readonly op: "set"; readonly slot: string; readonly item: () => unknown };

/** One shared entry-history primitive, for both declared operands and typed reads. */
export function entryValue(j: Judging, ref: Held, at: ScopeRef | GenesisSelfRef, part: EntrySelection): unknown {
  // Read from the reference. Nothing is fetched.
  if (part.op === "ref") return ref;
  if (part.op === "scope") return at;
  if (part.op === "seq") return typeof ref === "number" ? ref : ref.seq;
  // Read from the entry's bytes.
  const matched = entryOf(j, ref);
  if (!matched) return null;
  const { entry, local } = matched;
  const input = entry.input;
  if (part.op === "kind") return kindOf(entry);
  if (part.op === "time") return entry.time;
  if (part.op === "intent") return input.type === "act" ? intentDigest(input.signed.intent) : input.type === "genesis" && input["founding"] ? intentDigest(input["founding"].intent) : null;
  // The primary item: the item the entry opens, by the entry's own `seq`, or the item an act or a timed entry is on.
  if (part.op === "on") return entry.effects.some((e) => e.effect === "open") ? entry.seq : input.type === "act" ? input.signed.intent.on : input.type === "timed" ? input.item : null;
  if (part.op === "field") return fieldOf(j, entry, local, part.name);
  if (part.op === "opened") return entry.effects.some((e) => e.effect === "open") ? given(entry, entry.seq, part.name) : null;
  if (part.op === "set") {
    const id = part.item();
    return isLocalId(id) ? given(entry, id, part.slot) : null;
  }
  // Section 6.5: a member of a capability record that this entry's effects hold, written `kind.member`. None when the entry holds
  // no record of that kind, or more than one.
  const [kind, ...member] = part.name.split(".");
  const records = entry.effects.filter((e) => e.effect === "record" && e.kind === kind);
  const record = records.length === 1 ? records[0] : undefined;
  return record?.effect === "record" ? (own(record.values, member.join(".")) ?? null) : null;
}

/** Adapt the remaining declared operand callers to the shared history primitive. */
function entryPart(j: Judging, ref: Held, at: ScopeRef | GenesisSelfRef, part: EntryPart, item: Item | null): unknown {
  const selected: EntrySelection = typeof part === "string" ? { op: part }
    : "field" in part ? { op: "field", name: part.field }
    : "opened" in part ? { op: "opened", name: part.opened }
    : "set" in part ? { op: "set", slot: part.set.slot, item: () => operand(j, part.set.item, item) }
    : { op: "carried", name: part.carried };
  return entryValue(j, ref, at, selected);
}

/** A part of the entry that a fact reference names. Null when the value is not a fact reference, or the entry does not have the part. */
function partOf(j: Judging, value: unknown, part: Part, item: Item | null): unknown {
  const ref: Held | null = isFactRef(value) ? value : isLocalId(value) ? value : null;
  if (ref === null) return null;
  const at = typeof ref === "number" ? j.scope.at : ref.at;
  if (typeof part === "string" || !("of" in part)) return entryPart(j, ref, at, part, item);
  // When the part named by `of` is itself a fact reference: its scope or its position. The entry behind it is not read.
  const inner = entryPart(j, ref, at, part.of, item);
  return !isFactRef(inner) ? null : part.then === "scope" ? inner.at : inner.seq;
}

// ---------------------------------------------------------------- operands (section 6.5)

/**
 * An operand's value. A slot with no `of` is read from `item`: the form's
 * own subject, or in the `where` of a range each item that the range covers.
 * An absent field, an empty slot, an unbound subject and a part that an
 * entry does not have are all null.
 */
export function operand(j: Judging, o: Operand, item: Item | null): unknown {
  if ("const" in o) return o.const;
  if ("none" in o) return null;
  if ("signer" in o) return j.signer?.member ?? null;
  if ("scope" in o) return j.scope.at;
  if ("intent" in o) return j.intent ?? null;
  if ("sender" in o) return j.sender ?? null;
  if ("update" in o) return j.update?.[o.update] ?? null;
  if ("result" in o) return j.result?.name ?? null;
  if ("item" in o) return (o.item === "each" ? j.each : j.subjects.get(o.item))?.id ?? null;
  if ("source" in o) return j.source ? partOf(j, copyFact(j.source), o.source, item) : null;
  // The sequenced note, section 5.2. No judge derives a sequenced definition yet (`derivable`), so no page is given here.
  if ("read" in o) throw new TypeError("a group read has no page in this judgment");
  let value: unknown;
  if ("field" in o) value = own(j.fields, o.field) ?? null;
  else if ("presented" in o) value = own(j.presented, o.presented) ?? null;
  else if ("element" in o) value = memberOf((name) => j.elements?.get(name), o.element);
  else {
    const of = o.of === undefined ? item : o.of === "each" ? (j.each ?? null) : (j.subjects.get(o.of) ?? null);
    value = of ? slotOf(of, o.slot) : null;
  }
  return o.part === undefined ? value : partOf(j, value, o.part, item);
}

/**
 * Equality of two values that operands read (section 6.2): equal canonical
 * JSON, after local facts are put in normal form. A fact reference to this
 * scope's own entry, with that entry's hash, is that entry's `seq`, where
 * it is the value, an element of a list or a member of a record, to any
 * depth. So a record as an entry's bytes hold it equals the same record as
 * `readFacts` gave it to a field or a slot. Null equals null and nothing
 * else.
 */
export type HashOf = (seq: number) => import("@generalbusiness/dap-contract").Digest | null;

/** Equality's normal form, using only the local hashes available to its reader. */
export function normalValue(value: unknown, at: ScopeRef | GenesisSelfRef, hashOf: HashOf): unknown {
  const normal = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normal);
    if (isFactRef(v)) return isLocalFact(v, at) && hashOf(v.seq) === v.hash ? v.seq : v;
    return isObject(v) ? Object.fromEntries(Object.entries(v).map(([name, member]) => [name, normal(member)])) : v;
  };
  return normal(value);
}

export function equal(j: Judging, a: unknown, b: unknown): boolean {
  const hashOf: HashOf = (seq) => j.own?.(seq)?.hash ?? null;
  return same(normalValue(a, j.scope.at, hashOf), normalValue(b, j.scope.at, hashOf));
}
