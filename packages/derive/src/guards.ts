/**
 * Guard derivation (scope contract, section 6.5). Every guard is derived in
 * the commit from local state, the recorded inputs and the one clock reading.
 * A guard passes, fails, or is not judged; it never passes or fails on
 * evidence that the rest of an enumeration could overturn.
 */

import type { CheckedSequence } from "@generalbusiness/dap-bytes";
import { declarationOf } from "./program/declaration.ts";
import type { Bounds, Entry, FactRef, FieldType, FieldValue, Guard, MemberRef, Prepared, Reason, ScopeRef, GenesisSelfRef, ScopeKind, UnavailableReason, Digest, ScopeId, SequenceRef, PlatformDefinition, Sealed } from "@generalbusiness/dap-contract";
import { canonicalBytes, digestBytes } from "@generalbusiness/dap-bytes";
import type { Signer } from "./attribution.ts";
import { type Capabilities } from "./capability.ts";
import type { Own, Snapshots } from "./fields.ts";
import { type AtHand, type Declined, type JudgedInput, type PlatformRules } from "./marks.ts";
import { copyEntry, operand, slotOf, type JudgmentCopy } from "./operand.ts";
import type { Item, Party, StateView } from "./state.ts";
import { type Clock } from "./time.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { own } from "./values.ts";

import { conditionSubjects } from "./program/condition-plan.ts";
import { captureProgramReads, recordProgramLeaf } from "./program/observe.ts";

export { operand, slotOf };

/** A foreign entry fetched before the turn, and the name of the definition its scope pins (section 6.2, the `fact` field). */
export interface Fetched { fact: FactRef; entry: Entry; sequence: CheckedSequence; under: string }

/**
 * One admitted origin row (ruling 080e7c84, item 2): the entry, its label,
 * its original bytes and, where the same rows prove its sequence from
 * genesis bytes, that sequence. A `Fetched` is the case with a sequence. A
 * row with no sequence names no identity; an algorithm reads it only as the
 * creator that an admitted first entry names as its source.
 */
export interface SourceCopy { readonly fact: FactRef; readonly entry: Entry; readonly under: string; readonly bytes: string; readonly sequence: CheckedSequence | null }

/** Staged existing result material. Only the late owned-context admission grants operands. */
export interface RetainedResultOperand { readonly classified: unknown; readonly under: string }
export interface RetainedResultMaterial {
  readonly localSequence: CheckedSequence;
  readonly origin: Sealed;
  readonly operands: readonly RetainedResultOperand[];
}

/** Original retained bytes and an exact caller anchor, never birth proof. */
interface RawAnchoredBody {
  readonly fact: FactRef;
  readonly entry: Entry;
  readonly originalBytes: string;
  readonly anchor: { readonly scope: ScopeId; readonly seq: number; readonly hash: Digest };
}
/** Offline evidence keeps its actual name source explicit. Neither arm is Fetched. */
export type AnchoredJudgmentCopy =
  | (RawAnchoredBody & {
      readonly mode: "caller-anchor";
      readonly exporterRow: { readonly at: SequenceRef; readonly pin: PlatformDefinition };
    })
  | (RawAnchoredBody & {
      readonly mode: "retained-name";
      /** The adapter takes this name from the actual retained row. */
      readonly under: string;
    });

/** Explicit assumptions for a Replay adapter, separate from verified runtime evidence. */
export interface ReplayAssumptions {
  readonly recorded: Entry;
  readonly facts: readonly AnchoredJudgmentCopy[];
  readonly source: AnchoredJudgmentCopy | null;
}

/**
 * One `rule` guard as preparation evaluates it (section 5.2, step 5):
 * the rule, its expression, and the input of section 6.5 with its digest.
 */
export interface RuleInput { rule: string; source: string; input: unknown; digest: Digest }

/** Everything the guards, effects and sends of one input read. Built once by a judge, inside the commit. */
export interface Judging {
  view: StateView;
  definition: ValidDefinition;
  bounds: Bounds;
  clock: Clock;
  scope: { at: ScopeRef | GenesisSelfRef; kind: ScopeKind; creator: ScopeRef | null };           // a genesis is judged before its scope has a state
  self: number;                                        // the `seq` of the entry being written (section 6.4)
  kind: string;
  fields: Readonly<Record<string, FieldValue>>;        // with defaults; an absent optional field has no key; a local fact in normal form
  fieldTypes: Readonly<Record<string, FieldType>>;
  subjects: ReadonlyMap<string, Item>;                 // `on` and each `also.<name>`, as they are before the effects
  signer: Signer | null;
  facts: ReadonlyMap<Digest, JudgmentCopy>;             // explicitly matched evidence for named fields, in `uses` order
  prepared: readonly Prepared[];
  used: Prepared[];                                    // the prepared results the guards read, for the entry
  asked?: RuleInput[] | undefined;                     // set by `prepareRules` only: collect each rule's input and judge nothing on it
  // What the operands of section 6.5 read beside the above. Each is absent where the input has none, and its operand is then none.
  own?: Own | undefined;                               // this scope's own history: a local fact, and a part of one
  snapshot?: Snapshots | undefined;                    // the snapshots of staged refs that this scope retains, by digest (section 16.4)
  intent?: Digest | undefined;                         // an act: the digest of the intent being judged
  sender?: ScopeRef | undefined;                       // a handler and a result clause: the envelope's source scope, as verified
  source?: JudgmentCopy | undefined;                  // a handler: its matched source evidence
  update?: { state: string; item: FactRef; revision: number } | undefined;   // a `relate` handler: the update being applied
  result?: Reason | undefined;                         // a result clause: the reason on the result being recorded
  presented?: Readonly<Record<string, FieldValue>> | undefined;   // an act: the facts presented beside the intent
  elements?: ReadonlyMap<string, unknown> | undefined; // inside a list form: each element it binds, by its `as` name
  elementTypes?: ReadonlyMap<string, FieldType | null> | undefined;   // the type of each bound element, when the definition states it
  each?: Item | undefined;                             // a fan-out send: the item of that send
  capabilities?: Capabilities | undefined;             // the rules of the capabilities this judge can derive (section 6.11). Without them a capability form is not judged
  declined?: Map<Guard, string> | undefined;           // each capability guard that did not hold, with the refusal its capability names
  // Platform code (section 6.1). A declared definition holds no mark, so its judge needs none of these.
  platform?: PlatformRules | undefined;                // the rules of the platform definition that the scope pins. Without them a mark is a fault
  judged?: JudgedInput | undefined;                    // the input of the entry being judged, whole, as a rule is given it
  ran?: { clock: boolean } | undefined;                // one for a judgment: whether a rule that reads the clock was run for it
  settling?: boolean | undefined;                      // the form of the row declares `settles`: an effect that a rule returns changes no state (section 6.4, revision 22)
  bound?: boolean | undefined;                         // the delivery is bound to an item (section 17.2a): an `open` effect of a rule is a fault
  outcome?: { selected: boolean | null; further: boolean } | undefined;   // an outcome: what the ledger derived before the owner's effects, which its rules are given (section 6.1, revision 20)
  coded?: Map<Guard, Declined> | undefined;            // each guard that is a mark and did not hold, with the refusal its rule states
  beside?: AtHand | undefined;                         // the further observations and the values at hand for this entry, and what its rules read of them (sections 4.1 and 6.2)
}

/** Passed, failed, or not judged, with the reason for the Unavailable answer (section 4.2). */
export type GuardResult = "pass" | "fail" | UnavailableReason;

const ok = (holds: boolean): GuardResult => (holds ? "pass" : "fail");

export const members = (party: Party | undefined): readonly MemberRef[] => (party === null || party === undefined ? [] : Array.isArray(party) ? (party as readonly MemberRef[]) : [party as MemberRef]);

/**
 * What a `rule` reads, exactly (section 6.5): the subjects' records, the
 * kind and fields, the signer's member, and the content of each fetched
 * fact. No clock and no other item.
 */
export function ruleInput(j: Judging): unknown {
  return {
    kind: j.kind, fields: j.fields, signer: j.signer?.member ?? null,
    subjects: Object.fromEntries(j.subjects), facts: [...j.facts.values()].map(copyEntry),
  };
}

/**
 * True when a written form reads an unbound `also` name as a subject: as an
 * `of`, or as the `item` of an operand. Section 6.4: an effect, a send or a
 * notice whose `if` reads one is not applied.
 */
export function readsUnbound(j: Pick<Judging, "subjects">, v: unknown): boolean {
  for (const name of conditionSubjects(v)) if (!j.subjects.has(name)) return true;
  return false;
}

/** Match one prepared Boolean against the complete prescribed input, or collect it. */
export function preparedRule(j: Judging, rule: string): { result: GuardResult; input: unknown; digest: Digest } {
  const input = ruleInput(j);
  const digest = digestBytes(canonicalBytes(input));
  const reported = (result: GuardResult) => {
    const reads = { rule, digest, input, opaque: true };
    captureProgramReads(j.definition, reads);
    recordProgramLeaf(j.definition, "prepared", `rules.${rule}`, "prepared", result, reads);
    return { result, input, digest };
  };
  if (j.asked) {
    // Preparation: the result is not known yet, so the guard is passed over and the guards after it are met.
    if (!j.asked.some((a) => a.rule === rule && a.digest === digest)) j.asked.push({ rule, source: own(declarationOf(j.definition).rules, rule)!, input, digest });
    return reported("pass");
  }
  // Section 5.2, step 6.4: a rule's result from preparation is reused only when it was prepared over these inputs.
  const prepared = j.prepared.find((p) => p.rule === rule && p.input === digest);
  if (!prepared) return reported("unavailable");
  if (!j.used.includes(prepared)) j.used.push(prepared);
  return reported(ok(prepared.result));
}
