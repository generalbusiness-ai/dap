/**
 * Send derivation (scope contract, sections 6.4, 6.6, 7.2 and 7.3). Each
 * send that is made takes the next ordinal, in the order of the forms, and a
 * fan-out's sends in the order of their items. A send reads the fields and
 * each subject as the entry's effects left it. Its condition is judged on
 * the state before them.
 */

import type { Digest, FieldType, GenesisSelfRef, Input, Seed, Send, SendMark, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isSend, resolveGenesisSelf, scopeIdOf } from "@generalbusiness/dap-bytes";
import { creationContextOf, type CreationContext } from "./creation-context.ts";
import type { Derived } from "./effects.ts";
import { isLocalFact } from "./fields.ts";
import { slotOf, type Judging } from "./guards.ts";
import { coveredItems } from "./lists.ts";
import { judgeCondition } from "./program/condition-value.ts";
import { readValue } from "./program/read-value.ts";
import { sendReadType, sendSlotType, type SendFields, type SendPlan, type SendSourcePlan } from "./program/send-plan.ts";
import { checkedBody, sendPlan, type BodyStructure, type SendNode } from "./program/structure.ts";
import { givenTo, outside, ruleFor, run } from "./marks.ts";
import { observeNativeCall } from "./program/native-trace.ts";
import { sendValue } from "./send-value.ts";
import type { Item } from "./state.ts";
import { isFactRef, isLocalId, isObject, isScopeRef, same } from "./values.ts";
import { enterProgramInstruction } from "./program/observe.ts";

/** What the send forms of one input made. */
export type Sends = Derived<{ sends: Send[] }>;

/**
 * Section 6.6, "Where an `index` send goes": the directory that a scope
 * records at its genesis. It is its creator, when that is a directory;
 * otherwise the directory that its creator recorded, which the platform puts
 * in every `create` of a lane. Null: the scope has none.
 * Call only on the judged input or checked retained genesis, after its
 * source/message/seed association. This reader supplies no birth proof.
 */
export function directoryOf(genesis: Pick<Extract<Input, { type: "genesis" }>, "seed" | "message" | "source" | "sourceKind">): ScopeRef | null {
  const creator = genesis.seed.creator;
  if (creator && genesis.sourceKind === "directory") {
    const source = genesis.source;
    if (!source) return null;
    const resolved = resolveGenesisSelf(creator, source);
    return resolved && same(resolved, source.at) ? resolved : null;
  }
  const named = isObject(genesis.message?.body) ? genesis.message.body["directory"] : null;
  // This reserved place means Directory. Domain fields cannot select it.
  return isScopeRef(named) ? named : null;
}

/**
 * Section 6.6, "`membership` in a `create`": the membership scope that a
 * scope records, with its genesis. It is a function of the genesis
 * entry, as the directory is: the member `membership` in the body of the
 * creation, which the platform sets. A membership scope is its own. Null:
 * the genesis names none.
 *
 * Platform siblings created beside membership fix its genesis later
 * (authority note, section 3.3). Ordinary creations and the explicit versioned
 * declared creation context carry a full reference in this authoritative body,
 * separate from any domain field of the same name.
 */
export function membershipOf(genesis: Pick<Extract<Input, { type: "genesis" }>, "seed" | "message">, at: ScopeRef): ScopeRef | null {
  // Callers supply their checked local genesis and its full association.
  if (genesis.seed.kind === "membership") return scopeIdOf(genesis.seed) === at.scope ? at : null;
  const named = isObject(genesis.message?.body) ? genesis.message.body["membership"] : null;
  return isScopeRef(named) ? named : null;
}

/**
 * `cause` is the seed cause of any scope this input creates (section 7.2):
 * an act's intent digest, a delivery's delivery cause digest, or a genesis's
 * own seed digest. `first` is the ordinal of the first written send: 1 in a
 * child's genesis, whose result is at ordinal 0. `recorded`: the directory
 * that the scope records, when the entry being written is its genesis. Any
 * later entry reads it from the genesis entry.
 *
 * Section 4.2, check 12: in platform data a mark in the written list gives
 * no request, or one, at its position. The request takes the ordinal that a
 * written send would take there. It is a `create`, a `tell` or a `relate`
 * in the contract's form, and the checks on sends are made on it as on a
 * written one. `opening`: the entry opens an item, by its row or by a rule.
 * A relationship is of an item, so only such an entry may name `self` as
 * the item of a `relate`, as the validator has it for a written send.
 */
interface WrittenSend { readonly op: "written"; readonly body: BodyStructure; readonly node: SendNode; readonly plan: SendPlan }
type NativeSendMark = Pick<SendMark, "code" | "row" | "always">;
interface NativeSend { readonly op: "native"; readonly mark: NativeSendMark; readonly body?: BodyStructure; readonly node?: SendNode }
type SendInstruction = WrittenSend | NativeSend;

/** Execute only the send instructions of this admitted body. */
export function evaluateSends(j: Judging, body: BodyStructure, working: ReadonlyMap<string, Item>, cause: Digest, first = 0, recorded?: ScopeRef | null, opening = false): Sends {
  checkedBody(j.definition, body);
  const nodes = body.nodes.filter(node => node.category === "send");
  const instructions = nodes.map((owner): SendInstruction => {
    if (owner.op === "native") return { op: "native", mark: owner.data, body, node: owner };
    const plan = sendPlan(j.definition, body, owner);
    if (!plan) throw new TypeError("send has no captured executable instruction");
    return { op: "written", body, node: owner, plan };
  });
  return executeSends(j, instructions, working, cause, first, recorded, opening);
}

/** Native outcomes join returned requests through the same checked Native leaf. */
export function joinReturnedSends(j: Judging, marks: readonly NativeSendMark[], working: ReadonlyMap<string, Item>, cause: Digest, first = 0, recorded?: ScopeRef | null, opening = false): Sends {
  return executeSends(j, marks.map(mark => ({ op: "native", mark })), working, cause, first, recorded, opening);
}

function executeSends(j: Judging, instructions: readonly SendInstruction[], working: ReadonlyMap<string, Item>, cause: Digest, first: number, recorded: ScopeRef | null | undefined, opening: boolean): Sends {
  const on = working.get("on") ?? null;
  let unresolved: string | null = null;
  /** A send reads each subject as the effects left it. `each`: the item of a fan-out send. */
  const reading = (each: Item | null): Judging => ({ ...j, subjects: working, each: each ?? undefined });

  // The directory is a function of the genesis entry, and is read from it, through the scope's own history. It is no member of the
  // folded state: the state that a checkpoint digests is as the first delivery left it, and a verifier reads the same entry.
  let directory = recorded;
  /** The directory this scope records. Undefined: its genesis entry cannot be read now. */
  const recordedDirectory = (): ScopeRef | null | undefined => {
    const genesis = directory === undefined ? j.own?.(0)?.entry.input : undefined;
    if (genesis?.type === "genesis") directory = directoryOf(genesis);
    return directory;
  };

  // Genesis is not in own(0) until it seals. Later turns/replay already have
  // that immutable input. Only declared non-membership scopes forward this
  // opt-in; platform siblings and membership-self keep their old behavior.
  const recordedContext = (): CreationContext => {
    if (j.scope.kind === "membership") return { kind: "legacy" };
    const genesis = j.self === 0 ? j.judged : j.own?.(0)?.entry.input;
    return genesis?.type === "genesis" && isDigest(genesis.seed.definition)
      ? creationContextOf(genesis.message?.body, j.definition.digest) : { kind: "legacy" };
  };

  /**
   * Section 6.6, "`membership` in a `create`": the membership scope that this scope records, which the platform puts in every
   * `create`. A membership scope is its own, and every other scope reads it from its genesis entry (`membershipOf`). Null: the
   * scope records none, and its creations hold no such member. Undefined: its genesis entry cannot be read now.
   */
  const recordedMembership = (declared: boolean): ScopeRef | GenesisSelfRef | null | undefined => {
    if (j.scope.kind === "membership") return j.scope.at;
    // A legacy/platform genesis records no membership reference while it is written: a directory's slot `repository.membership` is set later, by
    // the clause `applied` of its own `create`. So a creation that a genesis sends holds no such member, and the scopes that are
    // created beside membership get its scope ID in a field (authority note, revision 25, section 12.1.2, "No member `membership`
    // in these two creations"). A marked declared genesis instead uses its verified incoming full reference.
    if (j.self === 0) {
      const context = recordedContext();
      return declared && context.kind === "marked" ? context.membership : null;
    }
    const genesis = j.own?.(0)?.entry.input;
    const at = j.scope.at;
    return genesis?.type === "genesis" && at.genesis !== null ? membershipOf(genesis, at) : undefined;
  };

  /** Shared reference encoding keeps production and prototype sends on one leaf. */
  const wire = (value: unknown, type: FieldType | null): unknown => {
    const sent = sendValue(j, value, type);
    if (sent.unresolved !== null) unresolved = sent.unresolved;
    return sent.value;
  };
  const local = (id: unknown) => wire(id, { type: "item", of: "" });

  let incomplete = false;
  /** Every payload source reads the working state through its admitted descriptor. */
  const sent = (source: SendSourcePlan, each: Item | null): unknown => {
    switch (source.op) {
      case "self": return local(j.self);
      case "read": return wire(readValue(reading(each), source.read, on), sendReadType(source.read));
      case "collect": {
        const all = coveredItems(reading(each), source.range);
        if (!all) incomplete = true;
        return (all ?? []).map(item => Object.fromEntries(source.fields.map(([name, member]) => [name,
          member.op === "item" ? local(item.id) : member.op === "state" ? item.state : wire(slotOf(item, member.slot.name), sendSlotType(member.slot))
        ] as const).filter(([, value]) => value !== null)));
      }
      default: return exhaustive(source);
    }
  };
  const fields = (sources: SendFields, each: Item | null = null) => Object.fromEntries(sources.map(([name, source]) => [name, sent(source, each)] as const).filter(([, value]) => value !== null));
  // Addresses of a relate are read without wire conversion, as before.
  const address = (source: SendSourcePlan, each: Item | null): unknown => source.op === "self" ? j.self
    : source.op === "read" ? readValue(reading(each), source.read, on) : null;

  const sends: Send[] = [];
  const relations = new Set<string>();
  let creations = 0;
  for (const [i, instruction] of instructions.entries()) {
    const finish = enterProgramInstruction(j.definition, "sends", instruction.body ?? null, instruction.node ?? null,
      instruction.node?.path ?? `sends.${i}`, instruction.op === "native" ? "native" : instruction.plan.code.op);
    try {
    const refuse = (what: string) => ({ ok: false, reason: "send-unresolved", detail: `sends.${i}: ${what}` }) as const;
    const next = () => first + sends.length;
    const mark = instruction.op === "native" ? instruction.mark : null;
    if (mark) {
      const given = run(mark, () => {
        const rule = ruleFor(j, mark, "send"), callback = rule.run, context = givenTo(j);
        return observeNativeCall(j.definition, mark, "send", "run", callback, () => Reflect.apply(callback, rule, [context]) as ReturnType<typeof callback>);
      });
      // Revision 19, "More than one send mark": a rule whose mark states `always` returns exactly one request. None is a fault.
      if (given === null && (mark as SendMark).always === true) throw outside(mark, "no request, where its mark states always");
      if (given === null) continue;
      const request: Send | null = isObject(given) ? { n: next(), to: given.to, message: given.message } : null;
      const body = request && isSend(request) && request.message.class === "request" && isObject(request.message.body) ? request.message.body : null;
      if (!request || !body || request.message.class !== "request") throw outside(mark, "no request");
      const { to, message } = request;
      if (message.type === "create") {
        // Section 7.2: a creation is addressed by a seed that names this scope as creator, the input's cause, and which creation of the input it is.
        if (isScopeRef(to) || !same(to.creator, j.scope.at) || to.cause !== cause || to.ordinal !== creations++ || !isObject(body["fields"])) throw outside(mark, "a creation that its entry cannot ask for");
      } else if (message.type === "tell") {
        if (!isScopeRef(to) || typeof body["message"] !== "string" || !isObject(body["fields"])) throw outside(mark, "a tell that is not in the contract's form");
      } else {
        // Section 6.4: the key is the target by its scope ID, the item by its local ID, and the name as written. The item is this
        // scope's own: the one that the entry being written opens, or one that an earlier entry opened.
        const named = body["item"];
        const item = isObject(named) && named["self"] === true && Object.keys(named).length === 1 ? (opening ? j.self : null) : isFactRef(named) && isLocalFact(named, j.scope.at) && j.view.item(named.seq)?.opened === named.hash ? named.seq : null;
        if (!isScopeRef(to) || typeof body["name"] !== "string" || typeof body["state"] !== "string" || !isObject(body["detail"]) || item === null) throw outside(mark, "a relate that is not in the contract's form");
        const key = JSON.stringify([to.scope, item, body["name"]]);
        if (relations.has(key)) return { ok: false, reason: "duplicate-relation", detail: `sends.${i}` };
        relations.add(key);
      }
      // Revision 19, section 6.1 (row I3-38): the bound on the fields of one send holds for a rule's message, as the validator
      // holds a written one to it. A message with more is a fault of the rule.
      const carried = message.type === "relate" ? body["detail"] : body["fields"];
      if (isObject(carried) && Object.keys(carried).length > j.bounds.sendFields) throw outside(mark, `a message of more than ${j.bounds.sendFields} fields`);
      sends.push(request);
      continue;
    }
    if (instruction.op !== "written") throw new TypeError("Native send did not reach its execution leaf");
    const form = instruction.plan.code;
    if (form.op === "create") {
      // Section 7.2: the seed names this scope as creator, the input's cause, and which creation of that input this is.
      // Section 6.6: `self` is this scope's own pinned definition, which a definition cannot name by digest.
      const definition = form.definition === "self" ? j.definition.digest : form.definition;
      const seed: Seed = { v: 1, kind: form.kind, definition, creator: j.scope.at, cause, ordinal: creations++ };
      // Section 6.6: the platform puts the directory in every `create` of a lane: this scope, when it is one, or the one it records.
      const lanes = form.kind !== "lane" ? null : j.scope.kind === "directory" ? j.scope.at : recordedDirectory();
      if (lanes === undefined) return { ok: false, unavailable: "unavailable" };
      // Section 6.6: the body of a `create` is `{ fields, directory, membership }`. The membership scope is the one that the creating
      // scope records. A scope that records none creates without the member, so a creation of a scope that knows no membership
      // scope has the bytes it had. A membership scope itself is created without it.
      const membership = form.kind === "membership" ? null : recordedMembership(isDigest(definition));
      if (membership === undefined) return { ok: false, unavailable: "unavailable" };
      const context = recordedContext();
      if (context.kind === "invalid") return { ok: false, reason: "send-unresolved", detail: "invalid retained creationContext" };
      // A marked declared provenance propagates through declared creations,
      // never into a platform sibling or a membership creation. Ordinary
      // legacy bodies remain byte-for-byte unchanged when the marker is absent.
      const forward = membership && context.kind === "marked" && isDigest(definition) && form.kind !== "membership";
      // Native installation grants one bounded Root-to-child delegation.
      // Domain fields cannot choose it, and a child cannot delegate it again.
      const grant = context.kind === "marked" ? context.deviceCommand : undefined;
      const delegated = forward && grant && context.kind === "marked" && context.delegate === true
        && j.definition.digest === grant.root && isDigest(definition) && grant.definitions.includes(definition);
      const marker = delegated ? { v: 2, deviceCommand: grant, delegate: false } : { v: 1 };
      sends.push({ n: next(), to: seed, message: { class: "request", type: "create", body: { fields: fields(form.fields), ...(lanes ? { directory: lanes } : {}), ...(membership ? { membership } : {}), ...(forward ? { creationContext: marker } : {}) } } });
    } else if (form.op === "tell") {
      // Section 6.4: a send whose subject is unbound is not made.
      if (instruction.plan.absentSubjects.some(subject => !working.has(subject))) continue;
      const made = judgeCondition(j, instruction.body, instruction.node);
      if (typeof made === "string") return { ok: false, unavailable: made };
      if (!made) continue;
      // Section 6.6: a `tell` is addressed by a reference slot, read after the entry's effects.
      const to = sent(form.to, null);
      if (!isScopeRef(to)) return refuse(`the slot ${form.targetSlot} holds no scope`);
      sends.push({ n: next(), to, message: { class: "request", type: "tell", body: { message: form.message, fields: fields(form.fields) } } });
    } else if (form.op === "relate") {
      const relate = form;
      if (instruction.plan.absentSubjects.some(subject => !working.has(subject))) continue;
      // Section 6.6: a fan-out makes one send for each item that its range covers, in ascending order of item ID.
      const all = relate.each ? coveredItems(reading(null), relate.each) : [null];
      if (!all) return { ok: false, unavailable: "guard-incomplete" };
      for (const each of all) {
        const made = judgeCondition(each ? { ...j, each } : j, instruction.body, instruction.node);
        if (typeof made === "string") return { ok: false, unavailable: made };
        if (!made) continue;
        const to = relate.to.op === "self" ? null : address(relate.to, each);
        const item = address(relate.item, each);
        if (!isScopeRef(to)) return refuse("the target is not a scope");
        if (!isLocalId(item)) return refuse("the item is not a local item");
        // Section 6.4: the key is the target by its scope ID, the item by its local ID, and the name as written.
        const key = JSON.stringify([to.scope, item, relate.name]);
        if (relations.has(key)) return { ok: false, reason: "duplicate-relation", detail: `sends.${i}` };
        relations.add(key);
        sends.push({ n: next(), to, message: { class: "request", type: "relate", body: { name: relate.name, item: local(item), state: relate.state, detail: fields(relate.fields, each) } } });
      }
    } else if (form.op === "index") {
      // Section 6.6: a projection row goes to the scope's directory. A scope with no directory has no `index` send.
      const to = recordedDirectory();
      if (to === undefined) return { ok: false, unavailable: "unavailable" };
      if (to !== null) sends.push({ n: next(), to, message: { class: "advisory", type: "index", body: { fields: fields(form.fields) } } });
    } else exhaustive(form);
    if (incomplete) return { ok: false, unavailable: "guard-incomplete" };
    if (unresolved !== null) return refuse(unresolved);
    } finally { finish(); }
  }
  return { ok: true, sends };
}

function exhaustive(value: never): never { throw new TypeError(`unknown send instruction: ${String(value)}`); }
