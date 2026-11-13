/**
 * The judge of a genesis (scope contract, sections 7.1 and 7.2): the first
 * entry of a scope with no creator, which a signed intent asks for, and of
 * a child, which a `create` send of its creator asks for.
 *
 * A scope with no creator is the creation register, which an `install`
 * intent creates under `platform:register` (section 7.1). The first delivery
 * created a directory with no creator, by a `found` intent, as its stand-in
 * for a register (section 7.2, "Where each scope reads its closure"). That
 * creation stays, for the scopes of today's tests, and it is never of the
 * kind `register` or under the register's definition.
 */

import { nativeMark } from "./program/native.ts";
import type { Entry, FactRef, FactUse, GenesisInput, GenesisNonce, GenesisSelfRef, Prepared, Reason, Request, ScopeId, ScopeRef, Seed, Send, SignedIntent } from "@generalbusiness/dap-contract";
import { deliveryCauseDigest, genesisInputDigest, intentDigest, isDigest, isGenesisNonce, isSeed, messageDigest, resolveGenesisSelf, scopeIdOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { judgeDelivery, judgeDeliveryForReplay, reasonOf, type DeliveryContext } from "./delivery.ts";
import { creationFields, isIntent, readFields, textsNamed, useOf, type Texts } from "./fields.ts";
import { copyEntry, copyFact, copyKind, judgmentFacts, matchesCopy, readJudgmentFacts, replayAssumptions, replayContext, sentByCopy, sourceCopy, verifiedContext, withJudgmentSource, type JudgmentCopy } from "./operand.ts";
import type { Judging, ReplayAssumptions } from "./guards.ts";
import { giving } from "./handlers.ts";
import { executeBody } from "./program/body.ts";
import { namedBody } from "./program/structure.ts";
import { declarationOf } from "./program/declaration.ts";
import { withinCounts } from "./draws.ts";
import { fieldOutsideType, grantByRule, unjudged } from "./marks.ts";
import { directoryOf } from "./sends.ts";
import { creationContextOf } from "./creation-context.ts";
import type { Judgment } from "./judge.ts";
import type { StateView } from "./state.ts";
import { timeMs } from "./time.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { isFactRef, isLocalId, isObject, own, same } from "./values.ts";

/**
 * What asks for a directory (section 7.1). `name` is the name of the object
 * that was reached. `nonce` is minted at random by the caller, in the
 * transaction that writes the entry (section 2.2).
 */
export interface SignedCreation { name: ScopeId; nonce: GenesisNonce; seed: Seed; creation: SignedIntent }

/** What asks for a child (section 7.2): the delivery of a `create`, which is addressed by its seed. */
export interface Creation { name: ScopeId; nonce: GenesisNonce; to: Seed; from: FactRef; n: number; message: Request }

/** Opt-in signed birth has a body for every named typed detached text,
 * even if another field later makes genesis refuse. A null size is only
 * a historical replay answer: birth requires presence, while replay still
 * has to recover the payload or prove the later redaction. */
export function genesisBodiesPresent(definition: ValidDefinition, creation: SignedIntent, texts?: Texts): boolean {
  return !declarationOf(definition).capacity || textsNamed(own(declarationOf(definition).acts, declarationOf(definition).genesis)!.fields, creation.intent.fields).every(digest => texts?.(digest) !== undefined);
}

/** The name that the creation register's definition states (section 7.1; authority note, section 12.1). */
const REGISTER = "platform:register";

/**
 * Section 7.2, "The kinds of cause", the fourth row: the act that opened the
 * operation of an outcome entry. An operation's ID is the `seq` of the entry
 * that opened it and its ordinal there (section 4.1), so the outcome names
 * that entry's position. A foreign entry is read by its fact (section 7.4),
 * and a position alone names no bytes. So the opening entry is one that the
 * creation itself names by a fact among its fields, as the register's
 * `create` names the `found` entry in `claim` (authority note, section
 * 12.1). The source entry seals that message, and so that fact's hash.
 *
 * The entry is of the creator, at that position, earlier than the outcome,
 * and it holds the `operation` record of that ordinal. Null: no entry at
 * hand is that one (I3 deltas, entry EP1).
 */
function openerOf(source: Entry, at: ScopeRef, message: Request, facts: readonly JudgmentCopy[]): Entry | null {
  if (source.input.type !== "outcome") return null;
  const [seq, k] = source.input.operation.split(":").map(Number);
  const fields = isObject(message.body) && isObject(message.body["fields"]) ? Object.values(message.body["fields"]) : [];
  const named = (fact: FactRef): boolean => fields.some((value) => isFactRef(value) && same(value, fact));
  const matched = facts.find(copy => {
    const fact = copyFact(copy);
    return same(fact.at, at) && fact.seq === seq && fact.seq < source.seq && named(fact) && matchesCopy(copy, fact);
  });
  const entry = matched ? copyEntry(matched) : null;
  return entry?.effects.some((effect) => effect.effect === "operation" && effect.k === k) ? entry : null;
}

/**
 * Section 7.2, the four kinds of cause: the seed's cause matches the source
 * entry by the kind of that entry's input, each in its own byte domain. For
 * an outcome it is the digest of the intent of the act that opened the
 * outcome's operation, in the domain of an act's intent. `facts`: the
 * foreign entries at hand, among which that act's entry is looked for.
 */
function causeOf(source: JudgmentCopy, message: Request, facts: readonly JudgmentCopy[]): Seed["cause"] | null {
  const input = copyEntry(source).input;
  if (input.type === "act") return intentDigest(input.signed.intent);
  if (input.type === "delivery") return deliveryCauseDigest({ v: 1, from: input.from, n: input.n, message: messageDigest(input.message) });
  if (input.type === "genesis") return genesisInputDigest(input);
  if (input.type === "outcome") {
    const opener = openerOf(copyEntry(source), copyFact(source).at, message, facts)?.input;
    return opener?.type === "act" ? intentDigest(opener.signed.intent) : null;
  }
  return null;
}

/**
 * A genesis is written when its proof holds, whatever its genesis act then
 * decides: `applied`, or `refused`, which is terminal. A proof that fails is
 * `source-unverified` and writes nothing. The scope is provisional after an
 * applied child genesis and active after a directory's; the fold derives
 * that, and which of the entry's sends are held, from the entry.
 *
 * In platform data the genesis act may hold marks, and each rule is run at
 * the check of its place, as for an act (section 4.2). A fault of a rule
 * leaves the genesis not judged, and nothing is written (section 6.1).
 */
export function judgeGenesis(view: StateView, definition: ValidDefinition, asked: SignedCreation | Creation, context: DeliveryContext): Judgment {
  return withinCounts(view, definition, unjudged(() => genesisJudged(view, definition, asked, verifiedContext(context, { genesis: asked }))));
}

/** Replay keeps its explicit assumptions outside the verified delivery context. */
export function judgeGenesisForReplay(view: StateView, definition: ValidDefinition, asked: SignedCreation | Creation, verified: DeliveryContext, assumed: ReplayAssumptions): Judgment {
  const context = replayContext(verified, assumed, { genesis: asked });
  return context ? withinCounts(view, definition, unjudged(() => genesisJudged(view, definition, asked, context))) : { result: "unavailable", reason: "dependency-unavailable" };
}

function genesisJudged(view: StateView, definition: ValidDefinition, asked: SignedCreation | Creation, context: DeliveryContext): Judgment {
  const unverified = (detail: string): Judgment => ({ result: "source-unverified", detail });
  const { clock, bounds } = context;
  const creation = "creation" in asked ? asked.creation : null;
  const seed = "creation" in asked ? asked.seed : asked.to;
  if (!isGenesisNonce(asked.nonce)) throw new Error("the caller mints a canonical 16-byte genesis nonce");

  // Section 2.3: at genesis a scope checks that the digest of the seed equals its own name.
  if (!isSeed(seed) || scopeIdOf(seed) !== asked.name) return unverified("the name is not the digest of the seed");
  const existing = view.scope();
  if (existing) {
    // A repeat is answered from the genesis and adds nothing.
    if (!("creation" in asked)) {
      const assumed = replayAssumptions(context);
      return assumed ? judgeDeliveryForReplay(view, definition, asked, context, assumed) : judgeDelivery(view, definition, asked, context);
    }
    return existing.at.scope === asked.name && verifySignedIntent(asked.creation) && intentDigest(asked.creation.intent) === seed.cause ? { result: "repeat", seq: 0 } : unverified("the scope has another genesis");
  }
  if (isDigest(seed.definition) && seed.definition !== definition.digest) return unverified("the seed names another definition");

  let source: JudgmentCopy | null = null;
  if ("creation" in asked) {
    // Section 7.1: the creator's signature commits to the inputs of the seed, and the intent's digest is the seed's cause.
    const intent = asked.creation.intent;
    if (!verifySignedIntent(asked.creation) || !isIntent(intent)) return unverified("not a signed intent");
    // The register is created by an `install` intent, under its own definition and no other. A directory with no creator is the
    // first delivery's stand-in, by a `found` intent. No other kind of scope has no creator.
    const asks = seed.kind === "register" ? "install" : seed.kind === "directory" ? "found" : null;
    if (seed.creator !== null || asks === null || (seed.kind === "register") !== (declarationOf(definition).name === REGISTER) || seed.ordinal !== 0 || intentDigest(intent) !== seed.cause) return unverified("the seed is not the one this creation intent asks for");
    if (intent.to !== null || intent.kind !== asks || intent.on !== null || Object.keys(intent.expected).length > 0) return { result: "refused", reason: "bad-intent", detail: `a creation intent has kind ${asks}, and names no scope and no item` };
    const now = timeMs(clock.reading)!;
    const notAfter = timeMs(intent.notAfter)!;
    if (now >= notAfter) return { result: "refused", reason: "expired", detail: "notAfter" };
    if (notAfter - now > bounds.intentLifetimeSeconds * 1000) return { result: "refused", reason: "bad-intent", detail: "notAfter is further ahead than an intent may live" };
  } else {
    // Section 7.2, "What the child checks at step 2".
    if (!isFactRef(asked.from) || !isLocalId(asked.n) || !seed.creator || !same(resolveGenesisSelf(seed.creator, asked.from), asked.from.at)) return unverified("the source is not the creator the seed names");
    if (!isObject(asked.message) || asked.message.class !== "request" || asked.message.type !== "create") return unverified("not a creation request");
    source = sourceCopy(context, asked.from);
    if (!source) return { result: "unavailable", reason: "dependency-unavailable" };
    if (!sentByCopy(source, asked)) return unverified("the source entry holds no create at that ordinal with that seed and that message");
    if (causeOf(source, asked.message, judgmentFacts(context)) !== seed.cause) return unverified("the seed's cause does not match the source entry");
    context = withJudgmentSource(context, { genesis: asked }, source);
  }

  if (creation && !genesisBodiesPresent(definition, creation, context.texts)) return { result: "refused", reason: "bad-field", detail: "a named genesis text has no matching body" };

  const at: GenesisSelfRef = { scope: asked.name, genesis: null };
  const creator = seed.creator === null ? null : source ? resolveGenesisSelf(seed.creator, copyFact(source)) : null;
  const child = "creation" in asked ? null : asked;
  const result = (outcome: "applied" | "refused", reason?: Reason): Send[] =>
    (child ? [{ n: 0, to: child.from.at, message: { class: "result", of: { from: child.from, n: child.n }, outcome, ...(reason ? { reason } : {}) } }] : []);
  // Section 4.1: the genesis states its act kind, from the definition that the scope pins. No sender supplies it. A refused genesis holds it too.
  const provenance = source ? { source: copyFact(source), sourceKind: copyKind(source) } : { source: null, sourceKind: null } as const;
  const input = (decision: "applied" | "refused"): GenesisInput =>
    ({ type: "genesis", seed, nonce: asked.nonce, kind: declarationOf(definition).genesis, "founding": creation, ...provenance, n: child?.n ?? null, message: child?.message ?? null, decision });
  const sourceUse = source ? [useOf(copyFact(source), copyEntry(source), copyKind(source))] : [];
  /**
   * Section 7.2: a refused genesis is written, sends its `refused` result and
   * nothing else, and is terminal. Section 9.2: it records what its judgment
   * read: the source entry, each named fact once those are read, and each rule
   * result a guard read before the refusal.
   */
  const refuse = (reason: Reason, uses: readonly FactUse[] = sourceUse, prepared: readonly Prepared[] = []): Judgment =>
    ({ result: "write", draft: { input: input("refused"), uses, prepared, effects: [], sends: result("refused", reason), judgesTime: creation !== null } });

  // The source proved the whole message above. Reserved metadata is separate
  // from domain fields; an invalid opt-in is a terminal refusal, with no
  // declared child sends. An absent marker preserves the legacy judgment.
  if (child && creationContextOf(child.message.body, definition.digest).kind === "invalid") return refuse({ code: "bad-field" });

  // The genesis act, with the opener's parties from the creation message, or with the creation intent's fields. It has no signer:
  // nobody signs for a scope that does not exist yet, and the creation rule is the authority note's.
  const act = own(declarationOf(definition).acts, declarationOf(definition).genesis)!;
  const given = creation ? creation.intent.fields : creationFields(child!.message, child!.from, act.fields);
  const read = given ? readFields(act.fields, given, bounds) : null;
  if (!read?.ok) return refuse({ code: "bad-field" });
  // A scope has no entry before its genesis, so a fact that names it names nothing: `fact-mismatch`.
  const named = readJudgmentFacts(view, act.fields, read.fields, source ? [...judgmentFacts(context), source] : judgmentFacts(context), { at, own: Object.assign(() => null, { sequence: () => null }), texts: context.texts });
  if (named.result === "unavailable") return { result: "unavailable", reason: "dependency-unavailable" };
  /** The source entry, then each named fact that was read. The source is recorded once. */
  const uses = [...sourceUse, ...named.uses.filter((u) => u.fact.hash !== (source ? copyFact(source).hash : undefined))];
  // A field that names a local item names nothing: no item exists before a genesis. The facts read before it are recorded.
  if (named.result !== "read") return refuse({ code: named.result }, uses);
  // Platform data: what a rule of the genesis act is given (section 6.1). Check 7: a field whose type is a mark is checked by its rule.
  const clocked = { clock: false };
  const judged: GenesisInput = input("applied");
  const g = giving(view, definition, context, { at, kind: seed.kind, creator }, 0, judged, clocked, named.fields, named.facts, source ?? undefined);
  if (fieldOutsideType(g, act.fields)) return refuse({ code: "bad-field" }, uses);
  // Section 4.2, "A founding": the genesis of a scope with no creator makes no check 9. When the genesis act's `grant` is a mark,
  // its rule is run, after the signature and the seed are checked. A creation that the rule does not pass is refused
  // `unauthorized`, and nothing is written: no scope exists on an authority that was not shown. The genesis of a child runs no
  // such rule: its authority is its creator's entry.
  const mark = creation ? nativeMark(definition, act.grant, "grant") : null;
  const passed = mark ? grantByRule(g, mark) : null;
  if (passed && !passed.pass) return { result: "refused", reason: "unauthorized", detail: `the rule ${mark!.code} does not pass the initial key${passed.name === undefined ? "" : `: ${passed.name}`}` };
  const signer = passed?.pass && passed.member ? { member: passed.member, principal: null } : null;

  const j: Judging = {
    view, definition, bounds, clock, scope: { at, kind: seed.kind, creator }, self: 0, kind: declarationOf(definition).genesis, fields: named.fields, fieldTypes: act.fields,
    subjects: new Map(), signer, facts: named.facts, prepared: context.prepared, used: [], asked: context.asked, capabilities: context.capabilities,
    platform: context.platform, judged, ran: clocked, source: source ?? undefined,
  };
  // A child's result is ordinal 0. Every child seed uses the complete prospective applied input as its cause.
  // Section 6.6: the scope records its directory with this entry: its creator, or the directory that its creator put in the creation.
  const ran = executeBody(j, namedBody(definition, "act", declarationOf(definition).genesis, "act"), genesisInputDigest(judged), { first: child ? 1 : 0, directory: directoryOf(judged) });
  if (ran.result === "unavailable") return ran;
  if (ran.result === "refused") return refuse(reasonOf(ran), uses, ran.prepared);
  // No item exists before a genesis, so no transition is due (section 5.2, step 6.3), and no entry precedes it, so the clock is not behind.
  return { result: "write", draft: { input: input("applied"), uses, prepared: ran.prepared, effects: ran.effects, sends: [...result("applied"), ...ran.sends], judgesTime: creation !== null || ran.judgesTime } };
}
