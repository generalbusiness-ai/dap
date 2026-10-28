import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef, type HoldersObservation, type Item, type ObservationUse } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest } from "../src/evidence.ts";
import { RuleFault, type Operation, type RuleGiven } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { evidenceDestinationRulesV17, evidenceJobRecordWireV17, evidenceNoticeOpeningV17, readEvidenceJobRecordWireV17, type EvidenceJobRecordV17 } from "../src/destination-evidence-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";

// SCRIPTED Native-shaped records, opening and state ports with real canonical
// digests. These exercise actual helper/rule callbacks, not Native admission,
// membership/triager authority, an executed notice, or a recovery journey.
const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
function record(): EvidenceJobRecordV17 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, labels: [], roomService: null,
    checks: [{ name: "published", configuration: d("b"), required: true, checker: keys.una.member, stage: "published" }],
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: ["published"], class: "content" },
    ] });
  if (!proposed.ok) throw Error("The scripted policy is invalid");
  const binding = { v: 1 as const, source: "member" as const, stage: "published" as const, checker: keys.una.member,
    policyGeneration: { rules, seq: 10 }, roomService: null, serviceGeneration: { rules, seq: 0 }, auditOf: null,
    subject: { kind: "published" as const, publication: fact(1, destination), manifest: fact(2), receipt: fact(3, destination), written: fact(4, destination) } };
  const cause = { job: fact(10), publication: binding.subject.publication, commit: "a".repeat(40), order: { publication: 1, job: 20 },
    decidedAt: 30, kind: "timeout" as const, reason: "check-timeout", result: null };
  return { v: 1, job: fact(10), name: "published", configuration: d("b"), binding, bindingDigest: evidenceBindingDigest(binding), state: "timeout", admittedAt: 20,
    commit: cause.commit, tree: "b".repeat(40), base: "c".repeat(40), sourceFacts: [], commitProof: null,
    policy: { rules, head: { seq: 11, hash: d("c") }, revision: 10, proposal: proposed.digest, policy: proposed.policy,
      certificate: { request: fact(5, destination), certificate: fact(6, destination), proof: d("d"), commit: "a".repeat(40) }, serviceGeneration: binding.serviceGeneration },
    reuseOwner: null, reuse: null, holdOwner: null, holds: [], covered: [], policyOwner: null, incident: { job: fact(10), cause, state: "ready", creation: null, child: null, reason: null },
    result: null, signer: null, decidedAt: 30, reason: "check-timeout", observedGeneration: binding.serviceGeneration,
    funded: { reuse: false, holds: false, policy: false, incident: true }, countedJob: null, reuseRequested: false,
    deadline: t(15), forJob: null, noticeAt: null, holder: 7, requestAt: 15 };
}
function item(value: EvidenceJobRecordV17, marked = false): Item {
  return { id: 20, type: "evidence-job", state: "job-timedout", revision: 40, opened: d("e"), parties: {}, refs: { timeoutDecision: 30 },
    values: { record: evidenceJobRecordWireV17(value), noticeOpenedAt: marked ? 40 : null }, attributed: [] };
}
function opening(value: EvidenceJobRecordV17): Entry {
  return { v: 1, at: destination, seq: 40, prev: d("f"), time: t(19), clamped: false, epoch: 0,
    input: { type: "outcome", operation: "15:0", attempt: 1, owner: "platform:destination@17", kind: "evidence-result", result: "confirmed", evidence: { basis: "own-answer", body: { job: value.job } } },
    uses: [], prepared: [], effects: [{ effect: "value", item: 20, slot: "noticeOpenedAt", value: 40 },
      { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-notice", attempts: 1, for: value.holder },
      { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }], sends: [] };
}
const operation: Operation = { id: "40:0", owner: "platform:destination@17", kind: "evidence-notice", most: 1, for: 7, selected: null,
  attempts: [{ attempt: 1, opened: 40, outcomes: [{ seq: 41, result: "unknown", evidence: d("a"), selected: null }] }] };
function given(current: Item, value: EvidenceJobRecordV17, opened: Entry | null = opening(value), holders: HoldersObservation | null = null): RuleGiven {
  const observation: ObservationUse | null = holders ? { observation: holders, read: { run: "scripted-notice" as ObservationUse["read"]["run"], n: 0 }, use: "fresh", prior: null } : null;
  return { time: t(20), uses: [], input: { type: "outcome", operation: operation.id, attempt: 1, owner: operation.owner, kind: operation.kind,
    result: "confirmed", evidence: { basis: "own-answer", body: { job: value.job } } },
    resolved: { at: destination, self: 50, bounds: PROPOSED_BOUNDS, fields: {}, subjects: new Map(), signer: null },
    state: { item: (id: number) => id === current.id ? current : null, operation: () => operation },
    own: (seq: number) => opened && seq === opened.seq ? { entry: opened, hash: entryHash(opened) } : null,
    observed: () => observation, value: () => undefined, placed: () => undefined } as unknown as RuleGiven;
}
function notice() {
  const rule = evidenceDestinationRulesV17({})["evidence-notice-v17"];
  if (!rule || rule.place !== "outcome" || !rule.rules.wellFormed || !rule.rules.derives) throw Error("The actual notice rule is absent");
  return { wellFormed: rule.rules.wellFormed, derives: rule.rules.derives };
}
const holders = (count = 1): HoldersObservation => ({ subject: "holders", of: keys.una.member.membership, head: { seq: 10, hash: d("a") },
  action: "issue.triage", count, holders: count ? [keys.rita.member.member] : [], definition: "platform:membership@8", at: t(20) });

test("a funded timeout opens one notice; its verified original marker never opens a replacement, even after unknown", () => {
  const value = record(), initial = item(value), marked = item(value, true), before = canonicalize(value);
  expect(initial.values["noticeOpenedAt"]).toBeNull();
  expect(evidenceNoticeOpeningV17(given(initial, value), initial, value)).toEqual({ effects: [{ effect: "value", item: 20, slot: "noticeOpenedAt", value: 50 }],
    opens: [{ owner: "platform:destination@17", kind: "evidence-notice", attempts: 1, for: 7 }] });
  expect(evidenceNoticeOpeningV17(given(marked, value), marked, value)).toEqual({ effects: [], opens: [] });
  expect(canonicalize(value)).toBe(before);
  expect(operation.attempts[0]!.outcomes[0]!.result).toBe("unknown");
});

test("an invalid original marker refuses rather than spending another held notice", () => {
  const value = record(), marked = item(value, true), actual = opening(value);
  for (const marker of [false, "40", -1, {}]) {
    const malformed = { ...marked, values: { ...marked.values, noticeOpenedAt: marker } };
    expect(() => evidenceNoticeOpeningV17(given(malformed, value), malformed, value)).toThrow(RuleFault);
  }
  expect(() => evidenceNoticeOpeningV17(given(marked, value, null), marked, value)).toThrow(RuleFault);
  const wrong = { ...actual, effects: actual.effects.filter(effect => effect.effect !== "value") };
  expect(() => evidenceNoticeOpeningV17(given(marked, value, wrong), marked, value)).toThrow(RuleFault);
  const duplicate = { ...actual, effects: [...actual.effects, actual.effects[1]!] };
  expect(() => evidenceNoticeOpeningV17(given(marked, value, duplicate), marked, value)).toThrow(RuleFault);
});

test("unknown and incomplete triagers cannot consume the original offer; fresh complete triagers send its unchanged timeout once", () => {
  const value = record(), marked = item(value, true), rule = notice(), answer = { basis: "own-answer" as const, body: { job: value.job } };
  expect(rule.wellFormed("unknown", { basis: "own-answer", body: {} }, given(marked, value))).toBe(false);
  for (const observation of [null, holders(0), holders(33)]) {
    const context = given(marked, value, opening(value), observation);
    expect(rule.wellFormed("confirmed", answer, context)).toBe(true);
    expect(() => rule.derives(context, operation, false)).toThrow(RuleFault);
  }
  const context = given(marked, value, opening(value), holders()), result = rule.derives(context, operation, false);
  expect(result.opens).toEqual([]);
  expect(result.sends).toHaveLength(1);
  expect(result.sends[0]!.message).toMatchObject({ class: "request", type: "tell", body: { message: "published-check-failure",
    fields: { job: value.job, cause: canonicalize(value.incident!.cause), triagers: [keys.rita.member] } } });
  expect(result.effects.length).toBeLessThanOrEqual(2);
  const effect = result.effects.find(effect => effect.effect === "value" && effect.slot === "record");
  if (!effect || effect.effect !== "value") throw Error("The actual notice record update is absent");
  const sent = readEvidenceJobRecordWireV17(effect.value);
  if (!sent) throw Error("The actual notice record wire is invalid");
  expect(sent.incident!.cause).toEqual(value.incident!.cause);
  expect(rule.derives(given(item(sent, true), sent, opening(value), holders()), operation, false).sends).toEqual([]);
});
