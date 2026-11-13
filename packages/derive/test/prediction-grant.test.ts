import { observationRuntimeChange2 } from "./definition-corpus/forms-observes-variants.ts";
import { describe, expect, test } from "vitest";
import type { Entry, MemberId, ObservationUse, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { agrees, clockOf, entryOf, grantFrom, judgeAct, predictionGrant, type ActJudgment, type Presented, type RuleGiven } from "../src/index.ts";
import { Scope, grantOf, keySeen, keys, laneDefinition, membership, on, fields, rulebook, stating, t, weigherRules, weigherWith } from "./fixtures-entry.ts";

const { rita, una } = keys;
/** The membership that the scope records. The proven grant's `within` names it, so the scope's context states it. */
const scoped = { membership };

/** What a replica predicts for the signed bytes on the scope's state: the judgment, and the entry it would seal at that reading. */
function predict(s: Scope, signed: SignedIntent, reading = s.now): { judgment: ActJudgment; entry: Entry | null } {
  const judgment = judgeAct(s.state, s.definition, signed, s.context({ reading, grants: [predictionGrant(s.definition, rita, s.at)] }));
  return { judgment, entry: judgment.result === "write" ? entryOf(s.state, judgment.draft, clockOf(s.state, reading)) : null };
}

describe("a prediction with the stand-in grant", () => {
  /** A lane whose scope judges rita on a grant with a freshness proof: the grant that an observation of membership gives. */
  const proven = (): Scope => {
    const s = new Scope(laneDefinition);
    const seen = keySeen(rita.key, "@rita" as MemberId, 1);
    const use: ObservationUse = { ...seen, observation: { ...seen.observation, actions: predictionGrant(s.definition, rita, s.at).grant.actions } };
    const grant = grantFrom(use);
    s.presentedGrants = (): Presented[] => [{ grant, current: true }];
    return s;
  };

  test("equals the entry that the scope seals for the same signed bytes, except `input.authority`: the scope records the proven grant, and the prediction records the stand-in", () => {
    const s = proven();
    const [grant] = s.presentedGrants();
    expect(agrees(grant!.grant)).toBe(true);
    const offer = s.intent(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
    const predicted = predict(s, offer);
    const sealed = s.submit(offer, scoped);
    const assign = s.intent(rita, "assign", { ...on(s, s.last.seq), ...fields({ performer: una.member }) });
    const predictedAssign = predict(s, assign);
    const sealedAssign = s.submit(assign, scoped);
    for (const [prediction, judgment, entry] of [[predicted, sealed, s.entries.at(-2)!.entry], [predictedAssign, sealedAssign, s.last]] as const) {
      expect(prediction.judgment.result).toBe("write");
      expect(judgment.result).toBe("write");
      if (prediction.judgment.result !== "write" || judgment.result !== "write" || !prediction.entry) throw new Error("not written");
      // The judgment: the same effects and sends, from the same signer.
      expect([prediction.judgment.draft.effects, prediction.judgment.draft.sends]).toEqual([judgment.draft.effects, judgment.draft.sends]);
      // The entry: the same bytes, once the scope's authority stands in place of the prediction's.
      if (prediction.entry.input.type !== "act" || entry.input.type !== "act") throw new Error("not an act");
      expect(canonicalize({ ...prediction.entry, input: { ...prediction.entry.input, authority: entry.input.authority } })).toBe(canonicalize(entry));
      expect([prediction.entry.input.authority.map((g) => g.fresh), entry.input.authority.map((g) => agrees(g))]).toEqual([[null], [true]]);
    }
    // A refusal names the scope's reason: the same bytes again, at a moved revision.
    const stale = s.intent(rita, "assign", { on: s.last.seq - 1, expected: { on: 1 }, ...fields({ performer: una.member }) });
    const refusal = (j: ActJudgment) => [j.result, "reason" in j ? j.reason : null];
    expect(refusal(predict(s, stale).judgment)).toEqual(refusal(s.judge(stale, scoped)));
  });

  test("checks `notAfter` against the caller's clock: a clock past the scope's predicts `expired` where the scope writes", () => {
    const s = proven();
    const offer = s.intent(rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } });
    const late = predict(s, offer, t(120)).judgment;
    expect([late.result, "reason" in late ? late.reason : null]).toEqual(["refused", "expired"]);
    expect(predict(s, offer).judgment.result).toBe("write");
    expect(s.submit(offer, scoped).result).toBe("write");
  });

  test("serves no row of `observes`: the scope writes on its grant's proof, and the prediction answers `authority-unavailable`", () => {
    // Una's act `own` states one row: her own member. Her grant's observation serves it, so the scope reads nothing further.
    const s = new Scope(weigherWith(observationRuntimeChange2));
    const supplied = weigherRules();
    const platform = { ...supplied, rules: { ...supplied.rules, sees: { place: "guard" as const, refusals: ["unseen"], run: (given: RuleGiven) => (given.observed({ member: "@una" as MemberId }) ? { holds: true as const } : { holds: false as const, name: "unseen" }) } } };
    const context = { platform, membership, observed: [], observing: { membership, rules: rulebook, content: stating() } };
    const proof: ObservationUse = { ...keySeen(una.key, "@una" as MemberId, 3, t(-40)), use: "reused", prior: { seq: 1, hash: s.head.hash } };
    const own = s.intent(una, "own", { on: 0, expected: { on: s.item(0).revision }, fields: { a: una.member } });
    const predicted = judgeAct(s.state, s.definition, own, s.context({ ...context, grants: [predictionGrant(s.definition, una, s.at)] }));
    expect([predicted.result, "reason" in predicted ? predicted.reason : null]).toEqual(["unavailable", "authority-unavailable"]);
    expect(s.submit(own, { ...context, grants: [{ grant: { ...grantOf(una, s.at, ["weigher.set"]), fresh: proof }, current: true }] }).result).toBe("write");
  });
});
