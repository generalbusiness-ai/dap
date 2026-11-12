import { answersCatalogVocabularyQuestion } from "@generalbusiness/dap-contract/catalog-vocabulary";
/** Execute the instructions of one actual admitted body, including its finalization. */
import type { Digest, Effect, GenesisEffect, PlatformTimedRule, Prepared, RefusalReason, ScopeRef, Send, UnavailableReason } from "@generalbusiness/dap-contract";
import { evaluateEffects } from "../effects.ts";
import { evaluateSends } from "../sends.ts";
import type { Judging } from "../guards.ts";
import { judgeGuardNodes } from "./guard-value.ts";
import { overMax } from "./finalize.ts";
import { bodyJudgesClock, checkedBody, guardSource, type BodyStructure } from "./structure.ts";
import { settlementMatches, settlementSubject } from "./settlement.ts";
import { enterProgramInstruction } from "./observe.ts";

export type Ran =
  /**
   * `settles`: the form declares that it settles an item, the item was in a listed state, and these effects take it out of them
   * (section 17.3); or, by a mark, the item awaited the mark and these effects set it (section 6.4, revision 21). `bound`: the
   * delivery is bound to that item (section 17.2a), whatever is decided.
   */
  | { result: "ran"; effects: GenesisEffect[]; sends: Send[]; prepared: Prepared[]; judgesTime: boolean; settles: boolean; bound?: number }
  /** `name`: the reason the failed guard declares. `prepared`: the rule results the guards read before the refusal. An entry that records the refusal records them (section 9.2). */
  | { result: "refused"; reason: RefusalReason; name?: string; detail: string; prepared: Prepared[]; bound?: number }
  | { result: "unavailable"; reason: UnavailableReason };

export interface BodyOptions {
  readonly first?: number;
  readonly directory?: ScopeRef | null;
  readonly timed?: Pick<Judging, "platform">;
}

/** Guards, effects, sends, live-item bounds and settlement preserve their admitted order. */
export function executeBody(j: Judging, structure: BodyStructure | null, cause: Digest, options: BodyOptions = {}): Ran {
  if (!structure) throw new TypeError("body was not captured by its validation");
  checkedBody(j.definition, structure);
  const row = structure.row;
  const kind = row.kind === "receive" ? row.declaration.message : row.name;
  if (kind !== j.kind) throw new TypeError("program belongs to another body");
  const endObservation = enterProgramInstruction(j.definition, "bodies", structure, null, structure.frame.path, "body");
  try {
  const { first = 0, directory, timed } = options;
  const timedItem = structure.frame.kind === "timed" ? j.subjects.get("on")!.id : null;
  const opens = structure.frame.kind === "act" && row.kind === "act" && row.declaration.step === "open" ? row.declaration.on
    : (structure.frame.kind === "handler" || structure.frame.kind === "replacement") && row.kind === "receive" && !j.subjects.has("on") ? row.declaration.opens : null;
  const guardNodes = structure.nodes.filter(node => node.category === "guard");
  // Section 6.4, "A rule of a form that declares `settles` sets no state": the effects of a rule are checked against it.
  if (structure.settlement !== null) j.settling = true;
  // Section 6.5: the guards are one list with three results. A guard that is false refuses, also after one that is not completed.
  // Section 6.4: a guard whose subject is unbound is not evaluated, and an effect whose subject is unbound is not applied.
  const guards = judgeGuardNodes(j, structure, guardNodes);
  if (guards.result === "fail") {
    const failedNode = guardNodes[guards.at]!;
    const failed = guardSource(j.definition, structure, failedNode);
    // Section 4.2: a capability guard that does not hold is `capability-refused`, with the name its capability declares.
    const declined = j.declined?.get(failed);
    if (declined !== undefined) return { result: "refused", reason: "capability-refused", name: declined, detail: `guards.${guards.at}`, prepared: j.used };
    // Section 4.2: a mark in the written list is a guard of the list. Its path is its position, and its name is the refusal that
    // its rule states. The code is `guard-failed`, or the one that the rule's specification states.
    const coded = j.coded?.get(failed);
    if (coded) return { result: "refused", reason: coded.code ?? "guard-failed", name: coded.name, detail: `guards.${guards.at}`, prepared: j.used };
    return { result: "refused", reason: "guard-failed", ...(failedNode.op === "native" ? {} : (failedNode.data.reason === undefined ? {} : { name: failedNode.data.reason })), detail: `guards.${guards.at}`, prepared: j.used };
  }
  if (guards.result !== "pass") return { result: "unavailable", reason: guards.result };
  // Sections 6.6 and 6.7: a condition, or a range that a source or a send reads, that is not completed leaves the input not judged.
  const effects = evaluateEffects(j, structure, opens);
  if (!effects.ok) {
    if (structure.frame.kind === "timed") throw new Error(`timed rule ${row.name} cannot apply: ${"unavailable" in effects ? effects.unavailable : effects.reason}`);
    return "unavailable" in effects ? { result: "unavailable", reason: effects.unavailable } : { result: "refused", reason: effects.reason, detail: effects.detail, prepared: j.used };
  }
  if (structure.frame.kind === "timed") {
    // Final admission ties this frame to its immutable timed declaration.
    const opens = (row.declaration as PlatformTimedRule).opens ?? [], opened: Effect[] = [];
    const nativeOwner = timed?.platform?.named;
    if (opens.length && (!answersCatalogVocabularyQuestion(nativeOwner, "nativeTimedOperationOpen") || j.scope.kind !== "destination")) return { result: "unavailable", reason: "unavailable" };
    for (const [k, open] of opens.entries()) opened.push(
      { effect: "operation", k, owner: nativeOwner!, kind: open.kind, attempts: open.attempts, for: timedItem! },
      { effect: "attempt", operation: { k }, attempt: 1, result: "opened", selected: null },
    );
    return { result: "ran", effects: [...effects.effects, ...opened], sends: [], prepared: j.used, judgesTime: true, settles: false };
  }
  // Clauses have no send phase; their shell suppresses refusals after current-state reconstruction.
  let sends: Send[] = [];
  if (structure.frame.kind !== "clause" && structure.frame.kind !== "outcome-clause") {
    const outgoing = evaluateSends(j, structure, effects.working, cause, first, directory, effects.opened !== null);
    if (!outgoing.ok) return "unavailable" in outgoing ? { result: "unavailable", reason: outgoing.unavailable } : { result: "refused", reason: outgoing.reason, detail: outgoing.detail, prepared: j.used };
    sends = outgoing.sends;
  }
  // Section 6.3: `max` bounds the live items of a type, whatever opens the item: the row, or in platform data a rule.
  const full = effects.opened === null ? null : overMax(j.view, j.definition, effects.opened.type, effects.opened.state);
  if (full !== null) return { result: "refused", reason: "type-full", detail: full, prepared: j.used };
  // Section 6.1, "A rule that reads the clock": an entry for which such a rule was run judges time.
  const judgesTime = bodyJudgesClock(structure) || j.ran?.clock === true;
  // Section 17.3: a form that declares `settles` is judged in full. It settles when its subject is in a listed state at the
  // commit and the entry takes it out of the listed states. Any other entry of the form is new work.
  // By a mark (revision 21): before the entry the subject's state was one of `in` and its mark was `false`, and after the entry's
  // effects the mark is `true`. An entry of the form that finds the mark `true` already, or the state outside `in`, is new work.
  const settled = structure.settlement;
  const subject = settled && settled.op !== "copy" ? settlementSubject(settled) : null;
  const [was, is] = subject !== null ? [j.subjects.get(subject), effects.working.get(subject)] : [];
  const settles = settled !== null && settled.op !== "copy" && settlementMatches(settled.states, settled.op === "mark" ? settled.slot.name : null, was, is);
  return { result: "ran", effects: effects.effects, sends, prepared: j.used, judgesTime, settles };
  } finally { endObservation(); }
}
