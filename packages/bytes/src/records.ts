/**
 * Guards for the fixed records the contract defines (scope contract,
 * sections 2.1, 3, 4.1, 4.2, 7.4 and 9.1): the references, the seed, the
 * intent, an entry with its input, effects, sends, uses and prepared
 * results, and the views a read returns. Each is a pure function of the
 * value, and each record has its one guard here, beside the guards of the
 * identifiers. A client's transports use them on a reply, a verifier may use
 * them on what a source returns, and derive's judges use the same guards
 * for a reference, a seed and an intent.
 *
 * A guard is of shape only. A record passes when it is one of the variants
 * the contract names, has every member that variant requires, each of its
 * kind, and has no other member. A member the contract types as an
 * identifier or a fixed form is read by that form's one guard: a digest, a
 * scope ID, an incarnation, a scope kind, a key ID, a member ID, an
 * operation ID, an outbox ID, a definition's name, a timestamp, a signature,
 * and a position or count as a safe integer that is not negative. A member
 * the contract types as text (a name an application chose, an idempotency
 * key, a cursor, stored bytes, a retained entry's `under`) is read as text. It says nothing about whether a signature
 * holds, whether an entry is of some history, or whether a judgment was
 * right: those are the questions of the signature check, of a hash and of
 * the judges.
 *
 * What stays opaque, because the contract leaves it to another owner or to
 * the application: the body of a request or an advisory; the body of the
 * evidence of an outcome; a grant's `within`, when it is not one scope, and its `fresh`;
 * the value of each field of an intent and of an `index` effect; and
 * whether a slot's value is a value of the type its definition declares.
 * A slot's value is checked as far as `isFieldValue` goes: one of the forms
 * a field value can have.
 */

import type {
  Attempt, Dispatched, OutboxItem, Effect, Entry, Evidence, FactRef, FactUse, FieldValue, Grant, Head, Input, Intent, Item, LogPage, MemberRef, Message, ObservationUse, Party, Prepared, Read, ReadRefusal, Receipt, RefusalReason,
  RetainedInput, ScopeRef, Sealed, Seed, Send, SignedIntent, Status, Summary,
} from "@generalbusiness/dap-contract";
import { MAX_DEPTH, wellFormed } from "./canonical.ts";
import { isIncarnation, isScopeId } from "./domains.ts";
import { isDigest } from "./hash.ts";
import { isOutboxId, isKeyId, isMemberId, isOperationId, isPlatformDefinition, isScopeKind, isSignature, timeMs } from "./ids.ts";

type Rec = Record<string, unknown>;
type Check = (v: unknown) => boolean;

/** A JSON object: not null and not a list. */
export const isRecord = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
/** A position in a history, a local item's ID, an ordinal, a revision or a count: a safe integer that is not negative. */
export const isLocalId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

const wellFormedText: Check = (v) => typeof v === "string" && wellFormed(v);
const flag: Check = (v) => typeof v === "boolean";
const any: Check = () => true;
const orNull = (check: Check): Check => (v) => v === null || check(v);
const listOf = (check: Check): Check => (v) => Array.isArray(v) && v.every(check);
const is = (value: unknown): Check => (v) => v === value;
const isTime: Check = (v) => timeMs(v) !== null;
/** A name from a closed set. Only an own name of the table is one: `constructor` is not. */
export const among = <T extends string>(names: Record<T, true>) => (v: unknown): v is T => typeof v === "string" && Object.hasOwn(names, v);

/** A record with every member of `required`, each passing its check, and beside them only members of `optional`, each passing its check when present. */
const recordShape = (required: Record<string, Check>, optional: Record<string, Check> = {}): Check => (v) =>
  isRecord(v)
  && Object.entries(required).every(([name, check]) => Object.hasOwn(v, name) && check(v[name]))
  && Object.keys(v).every((name) => Object.hasOwn(required, name) || (Object.hasOwn(optional, name) && (v[name] === undefined || optional[name]!(v[name]))));

/** One of several variants, told apart by the member `by`. A variant the table does not name is no such record. */
const variant = (by: string, variants: Record<string, Check>): Check => (v) => {
  const name = isRecord(v) && Object.hasOwn(v, by) ? v[by] : undefined;
  return typeof name === "string" && Object.hasOwn(variants, name) && variants[name]!(v);
};

// Each table has every member of its union, and the compiler says so when the contract gains or loses one.
export const REFUSAL_REASONS: Record<RefusalReason, true> = {
  "revision-moved": true, alias: true, "duplicate-relation": true, "required-unset": true, "scope-full": true, "bad-intent": true, misaddressed: true, expired: true, "scope-refused": true,
  "unknown-act": true, "bad-field": true, "no-item": true, final: true, "fact-mismatch": true, unauthorized: true, "guard-failed": true, "capability-refused": true, "slot-full": true, "type-full": true, "entry-too-large": true, "send-unresolved": true,
  "unknown-message": true, "unsupported-definition": true, "bad-input": true, late: true,
};
export const READ_REFUSALS: Record<ReadRefusal, true> = {
  "not-found": true, "wrong-incarnation": true, forbidden: true, "scope-provisional": true, "unsupported-definition": true, "history-unavailable": true, "too-large": true, unavailable: true,
  "sessions-unavailable": true, "clock-behind": true,
};
const STATUS: Record<Status, true> = { provisional: true, active: true, refused: true };
const ATTEMPTED: Record<Attempt["answer"], true> = { none: true, "wrong-incarnation": true, "not-found": true, retry: true };
const DISPATCHED: Record<Dispatched["answer"], true> = { ...ATTEMPTED, acknowledged: true };
const CLASS: Record<Message["class"], true> = { request: true, result: true, control: true, advisory: true };
const DECISION: Record<Extract<Input, { decision: unknown; type: "delivery" }>["decision"], true> = { applied: true, refused: true, superseded: true };
const CLAUSE: Record<NonNullable<OutboxItem["result"]>["clause"], true> = { applied: true, refused: true, superseded: true, conflict: true };
const FINDING: Record<NonNullable<OutboxItem["diagnosis"]>["finding"], true> = { undelivered: true, "delivery-unavailable": true };
const RETAINED: Record<RetainedInput["kind"], true> = { definition: true, entry: true, rule: true, text: true, snapshot: true, value: true };
/** Why a delivery was refused: a code the contract names and, where one exists, the name the failed guard declares. */
const reason = recordShape({ code: among(REFUSAL_REASONS) }, { name: wellFormedText });

// ---------------------------------------------------------------- references, the seed and the intent (sections 2.1 and 3)

const scopeRef = recordShape({ scope: isScopeId, inc: isIncarnation, kind: isScopeKind });
export const isScopeRef = (v: unknown): v is ScopeRef => scopeRef(v);
const head = recordShape({ seq: isLocalId, hash: isDigest });
export const isHead = (v: unknown): v is Head => head(v);
const factRef = recordShape({ at: scopeRef, seq: isLocalId, hash: isDigest });
export const isFactRef = (v: unknown): v is FactRef => factRef(v);
const memberRef = recordShape({ membership: scopeRef, member: isMemberId });
export const isMemberRef = (v: unknown): v is MemberRef => memberRef(v);
/** A definition as a scope names it: the digest of a declaration, or a platform definition. */
export const isDefinitionName: Check = (v) => isDigest(v) || isPlatformDefinition(v);
const seed = recordShape({ v: is(1), kind: isScopeKind, definition: isDefinitionName, creator: orNull(scopeRef), cause: isDigest, ordinal: isLocalId });
export const isSeed = (v: unknown): v is Seed => seed(v);

/**
 * One of the forms a field value can have (section 6.2): a text, an integer, a truth value, a reference, a record of named
 * values, or a list of those. A list holds no list.
 */
const scalar: Check = (v) => wellFormedText(v) || (typeof v === "number" && Number.isSafeInteger(v) && !Object.is(v, -0)) || flag(v) || memberRef(v) || factRef(v) || scopeRef(v);
/**
 * A value that nests deeper than the canonical form allows, MAX_DEPTH containers, is no field value: no entry that holds it has canonical bytes. The
 * walk stops at that depth, so a reply cannot make it deeper than any value could be. `depth`: that of the value, from 1.
 */
const one = (v: unknown, depth: number): boolean => scalar(v) || (isRecord(v) && depth <= MAX_DEPTH && Object.values(v).every((m) => anyOf(m, depth + 1)));
const anyOf = (v: unknown, depth: number): boolean => one(v, depth) || (Array.isArray(v) && depth <= MAX_DEPTH && v.every((m) => one(m, depth + 1)));
export const isFieldValue = (v: unknown): v is FieldValue => anyOf(v, 1);
const party: Check = (v) => v === null || memberRef(v) || listOf(memberRef)(v);
export const isParty = (v: unknown): v is Party => party(v);
/** A record by chosen names, each value passing `check`. */
const named = (check: Check): Check => (v) => isRecord(v) && Object.values(v).every(check);

/** The shape of section 2.1. A valid signature over some other shape is not an intent. The actor is a key ID, as the contract types it. What each field holds is the act's to say. */
const intent = recordShape({ v: is(1), to: orNull(scopeRef), actor: isKeyId, kind: wellFormedText, on: orNull(isLocalId), expected: named(isLocalId), fields: isRecord, idempotencyKey: wellFormedText, notAfter: isTime });
export const isIntent = (v: unknown): v is Intent => intent(v);
/** An intent beside a signature of the one form a signature has. Whether the signature is the actor's over these bytes is `verifySignedIntent`'s question. */
const signedIntent = recordShape({ intent, sig: isSignature });
export const isSignedIntentShape = (v: unknown): v is SignedIntent => signedIntent(v);
/** A grant, as far as the judge and an entry read it. `within` and `fresh` are the authority note's. */
const grant = recordShape({ issued: factRef, subject: memberRef, key: isKeyId, principal: orNull(memberRef), actions: listOf(wellFormedText), within: any, notAfter: orNull(isTime), fresh: any });
export const isGrant = (v: unknown): v is Grant => grant(v);

// ---------------------------------------------------------------- an entry and its parts (sections 4.1 and 7.4)

const request = recordShape({ class: is("request"), type: among({ create: true, tell: true, relate: true }), body: any });
const message = variant("class", {
  request,
  result: recordShape({ class: is("result"), of: recordShape({ from: factRef, n: isLocalId }), outcome: among(DECISION) }, { reason }),
  control: recordShape({ class: is("control"), type: is("confirm"), genesis: factRef }),
  advisory: recordShape({ class: is("advisory"), type: among({ index: true, notify: true }), body: any }),
});
export const isMessage = (v: unknown): v is Message => message(v);
const attempt = recordShape({ at: isTime, answer: among(ATTEMPTED) });
const factUse = recordShape({ fact: factRef, content: isDigest });
export const isFactUse = (v: unknown): v is FactUse => factUse(v);
const prepared = recordShape({ rule: wellFormedText, input: isDigest, result: flag });
export const isPrepared = (v: unknown): v is Prepared => prepared(v);
const send = recordShape({ n: isLocalId, to: (v) => scopeRef(v) || seed(v), message });
export const isSend = (v: unknown): v is Send => send(v);

/** A capability's name and version, of the one form `name@version`. */
const capabilityName: Check = (v) => typeof v === "string" && /^(hold|git-read)@(0|[1-9][0-9]*)$/.test(v);

const effect = variant("effect", {
  open: recordShape({ effect: any, item: isLocalId, type: wellFormedText, state: wellFormedText }),
  state: recordShape({ effect: any, item: isLocalId, state: wellFormedText }),
  party: recordShape({ effect: any, item: isLocalId, slot: wellFormedText, member: orNull(memberRef) }),
  ref: recordShape({ effect: any, item: isLocalId, slot: wellFormedText, to: orNull(isFieldValue) }),
  value: recordShape({ effect: any, item: isLocalId, slot: wellFormedText, value: orNull(isFieldValue) }),
  list: recordShape({ effect: any, item: isLocalId, slot: wellFormedText, change: among({ add: true, remove: true }), member: memberRef }),
  hold: recordShape({ effect: any, item: isLocalId, change: among({ open: true, renew: true, end: true }), epoch: isLocalId }),
  redact: recordShape({ effect: any, item: isLocalId, slot: wellFormedText, texts: listOf(isDigest) }),
  relation: recordShape({ effect: any, owner: scopeRef, item: isLocalId, name: wellFormedText, state: wellFormedText, revision: isLocalId }),
  // A capability's record: its name and version are of the one form `name@version`. What its key and its values hold is the capability's to say.
  record: recordShape({ effect: any, capability: capabilityName, kind: wellFormedText, key: listOf(isFieldValue), state: wellFormedText, values: isRecord }),
  activate: recordShape({ effect: any }),
  // Section 4.3: an operation's opening, and one change of one numbered attempt. An operation of the entry itself is named by its ordinal.
  // Section 17.2a: `for` is the holder that an operation of a held kind draws on, by its local ID, or `self` for the item that the same entry opens.
  operation: recordShape({ effect: any, k: isLocalId, owner: (v) => capabilityName(v) || isPlatformDefinition(v), kind: wellFormedText, attempts: isLocalId }, { for: (v) => v === "self" || isLocalId(v) }),
  attempt: recordShape({
    effect: any, operation: (v) => isOperationId(v) || recordShape({ k: isLocalId })(v), attempt: isLocalId,
    result: among({ opened: true, confirmed: true, refused: true, unknown: true }), selected: (v) => v === null || typeof v === "boolean",
  }),
  index: recordShape({ effect: any, from: factRef, fields: isRecord }),
  attention: recordShape({ effect: any, item: isLocalId, members: listOf(memberRef), reason: wellFormedText }),
} satisfies Record<Effect["effect"], Check>);
export const isEffect = (v: unknown): v is Effect => effect(v);

/**
 * The evidence of an outcome (sections 4.1 and 4.3, item 4): a basis the
 * contract names and a body, both its own members, and nothing else. The
 * body is its owner's to type, so any value is one, and it is never absent.
 * Which result may have which basis, and what a body means, are the
 * ledger's and the owner's checks.
 */
const BASIS: Record<Evidence["basis"], true> = { "own-answer": true, read: true, none: true };
const evidence = recordShape({ basis: among(BASIS), body: (v) => v !== undefined });
export const isEvidence = (v: unknown): v is Evidence => evidence(v);

/**
 * A retained observation (section 16.1): an observation, the read it came
 * from and how the entry used it. An observation is one of four fixed
 * records, each with exactly its members: the standing of one key, which
 * has no member `subject`; the standing of one member; what the rules
 * scope holds; and the holders of one action. Whether a value is true of
 * the observed scope's history, and every guard of freshness, are the
 * judges' and the verifier's questions.
 */
const observedFrom = { of: scopeRef, head, definition: isPlatformDefinition, at: isTime };
const controlled = { controller: orNull(isMemberId), controllerActive: orNull(flag) };
const keyObservation = recordShape({
  ...observedFrom, ...controlled, key: isKeyId, keyState: among({ active: true, retired: true, compromised: true, unknown: true }), member: isMemberId, memberState: among({ active: true, removed: true }),
  role: wellFormedText, actions: listOf(wellFormedText), within: recordShape({ membership: scopeRef }), notAfter: orNull(isTime),
});
const furtherObservation = variant("subject", {
  member: recordShape({ ...observedFrom, ...controlled, subject: any, member: isMemberId, memberState: among({ active: true, removed: true, unknown: true }), role: orNull(wellFormedText), activeKey: orNull(flag) }),
  rules: recordShape({
    ...observedFrom, subject: any, revision: isLocalId,
    content: variant("asked", {
      // Revision 19 (row I3-36): under a rules definition whose data states the value, the record also holds `singleControllerException`.
      // Revision 20 (row I3-43): and `extents`, a digest, under one whose data states that slot. Which of the two a definition states
      // is not known here: derive's `contentStates` makes that check, with the data of the observation's `definition`.
      rules: recordShape({ asked: any, approvals: isLocalId, ownerMayReview: flag, checks: listOf(recordShape({ name: wellFormedText, configuration: isDigest, required: flag, checker: isMemberId })), labels: listOf(wellFormedText) }, { singleControllerException: flag, extents: isDigest }),
      definitions: recordShape({ asked: any, active: listOf(recordShape({ digest: isDigest, name: wellFormedText })) }),
    }),
  }),
  // Revision 20 (row I3-42): the holders of one action. `holders` lists distinct member IDs, and no more than `count`. Their order,
  // and whether they are the first, are questions of the observed scope's history.
  holders: (v) => recordShape({ ...observedFrom, subject: any, action: wellFormedText, count: isLocalId, holders: listOf(isMemberId) })(v)
    && new Set((v as { holders: string[] }).holders).size === (v as { holders: string[] }).holders.length && (v as { holders: string[]; count: number }).holders.length <= (v as { count: number }).count,
});
const observationUse = recordShape({
  observation: (v) => (isRecord(v) && Object.hasOwn(v, "subject") ? furtherObservation(v) : keyObservation(v)),
  read: recordShape({ run: wellFormedText, n: isLocalId }), use: among({ fresh: true, reused: true }), prior: orNull(head),
});
export const isObservationUse = (v: unknown): v is ObservationUse => observationUse(v);
/**
 * The member `observed` of an input (section 4.1): a list of retained
 * observations in ascending order of `read.n`, each read at most once. It
 * is never an empty list: an input that retains none has no such member.
 */
const observed: Check = (v) => Array.isArray(v) && v.length > 0 && v.every(observationUse) && v.every((use: ObservationUse, i) => i === 0 || (v[i - 1] as ObservationUse).read.n < use.read.n);

/**
 * A delivery records what its message's class requires beside it: a request its decision, a result the clause that ran, a control
 * or an advisory nothing more. Of the four, only a delivery of a result may hold `observed` (section 4.1).
 */
const delivered = { type: any, from: factRef, n: isLocalId, message };
const deliveryOf: Record<Message["class"], Check> = {
  request: (v) => recordShape({ ...delivered, decision: among(DECISION) }, { reason, late: recordShape({ reason: (v) => wellFormedText(v) && v !== "" }) })(v)
    && isRecord(v) && (!Object.hasOwn(v, "late") || v["decision"] === "applied"),
  result: recordShape({ ...delivered, clause: among(CLAUSE) }, { observed }),
  control: recordShape(delivered),
  advisory: recordShape(delivered),
};
const input = variant("type", {
  genesis: recordShape({
    type: any, seed, inc: isIncarnation, kind: (v) => wellFormedText(v) && v !== "", "founding": orNull(signedIntent), source: orNull(factRef), n: orNull(isLocalId), message: orNull(request), decision: among({ applied: true, refused: true }),
  }),
  // Section 4.1: an act, an outcome and a delivery of a result may hold `observed`, and no other input may.
  act: recordShape({ type: any, signed: signedIntent, authority: listOf(grant), presented: named(factRef) }, { observed }),
  delivery: (v) => {
    const of = isRecord(v) && isRecord(v["message"]) ? v["message"]["class"] : undefined;
    return among(CLASS)(of) && deliveryOf[of](v);
  },
  diagnosis: recordShape({ type: any, of: recordShape({ seq: isLocalId, n: isLocalId }), finding: among(FINDING), attempts: listOf(attempt) }),
  // Section 4.1 and 5.5: the signed intent, the one grant judged, the capability and its step. Depth is bounded as for an act.
  preparation: recordShape({ type: any, signed: signedIntent, authority: listOf(grant), capability: capabilityName, step: wellFormedText }),
  timed: recordShape({ type: any, item: isLocalId, rule: wellFormedText, due: isTime }),
  // Section 4.1, "An outcome states its owner and its kind": both are always present, and the kind is a text that is not empty.
  outcome: recordShape({
    type: any, operation: isOperationId, attempt: isLocalId, owner: (v) => capabilityName(v) || isPlatformDefinition(v), kind: (v) => wellFormedText(v) && v !== "",
    result: among({ confirmed: true, refused: true, unknown: true }), evidence,
  }, { observed }),
  checkpoint: recordShape({ type: any, through: isLocalId, state: isDigest }),
} satisfies Record<Input["type"], Check>);
export const isInput = (v: unknown): v is Input => input(v);

const entry = recordShape({
  v: is(1), at: scopeRef, seq: isLocalId, prev: orNull(isDigest), time: isTime, clamped: flag, epoch: is(0),
  input, uses: listOf(factUse), prepared: listOf(prepared), effects: listOf(effect), sends: listOf(send),
});
export const isEntry = (v: unknown): v is Entry => entry(v);

// ---------------------------------------------------------------- views and reads (sections 4.1, 4.2 and 9.1)

const receipt = recordShape({ fact: factRef, definition: isDefinitionName, intent: orNull(isDigest), effects: listOf(effect), sends: listOf(isOutboxId), epoch: is(0) });
export const isReceipt = (v: unknown): v is Receipt => receipt(v);
const sealed = recordShape({ entry, hash: isDigest });
export const isSealed = (v: unknown): v is Sealed => sealed(v);
const item = recordShape(
  { id: isLocalId, type: wellFormedText, state: wellFormedText, revision: isLocalId, opened: orNull(isDigest), parties: named(party), refs: named(orNull(isFieldValue)), values: named(orNull(isFieldValue)), attributed: listOf(memberRef) },
);
export const isItem = (v: unknown): v is Item => item(v);
const summary = recordShape({
  scope: scopeRef, status: among(STATUS), definition: isDefinitionName, time: isTime, items: listOf(item),
  counts: listOf((c) => Array.isArray(c) && c.length === 3 && wellFormedText(c[0]) && wellFormedText(c[1]) && isLocalId(c[2])),
}, { reservationExpiry: (v) => recordShape({ clock: is("available"), time: isTime, expired: listOf(isLocalId) })(v) || recordShape({ clock: is("unavailable") })(v) });
export const isSummary = (v: unknown): v is Summary => summary(v);
const outboxItem = recordShape({
  outboxId: isOutboxId, to: (v) => scopeRef(v) || seed(v), class: among(CLASS), held: flag, attempts: listOf(recordShape({ at: isTime, answer: among(DISPATCHED) })), acknowledged: orNull(factRef),
  result: orNull(recordShape({ seq: isLocalId, clause: among(CLAUSE) })), diagnosis: orNull(recordShape({ seq: isLocalId, finding: among(FINDING) })),
});
export const isOutboxItem = (v: unknown): v is OutboxItem => outboxItem(v);
/** A page of stored entries. Each entry's `bytes` is text a reader hashes and parses itself; it is not read here. */
const logPage = recordShape({ scope: scopeRef, definition: isDefinitionName, entries: listOf(recordShape({ seq: isLocalId, hash: isDigest, bytes: wellFormedText })) });
export const isLogPage = (v: unknown): v is LogPage => logPage(v);
/** One retained input. Its `bytes` is text a reader checks against the digest itself; it is not read here. */
const retainedInput = recordShape({ kind: among(RETAINED), digest: isDigest, bytes: wellFormedText }, { under: wellFormedText, domain: wellFormedText });
/** Section 9.2, revision 19: `domain` is stated exactly when the kind is `value`, and it is not empty. */
export const isRetainedInput = (v: unknown): v is RetainedInput => {
  if (!retainedInput(v)) return false;
  const { kind, domain } = v as RetainedInput;
  return (kind === "value") === (domain !== undefined) && domain !== "";
};

/** A read (section 9.1): a value of the route's shape at a stated head, or a refusal the contract names, with the reference it may carry. */
export const isRead = <T>(value: (v: unknown) => v is T) => {
  const unread = recordShape({ ok: is(false), reason: among(READ_REFUSALS) }, { detail: (v) => scopeRef(v) || factRef(v) });
  const read = recordShape({ ok: is(true), at: head, value, complete: flag }, { next: (v) => typeof v === "string" });
  return (v: unknown): v is Read<T> => unread(v) || read(v);
};
/** A list of such records, as a paged read returns. */
export const isListOf = <T>(each: (v: unknown) => v is T) => (v: unknown): v is readonly T[] => Array.isArray(v) && v.every(each);
