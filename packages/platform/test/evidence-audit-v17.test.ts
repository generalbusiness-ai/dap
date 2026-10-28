import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, factRefOf, signIntent } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest } from "../src/evidence.ts";
import { readFacts, readFields, RuleFault, type Item, type Operation, type RuleGiven, type StateView } from "@generalbusiness/dap-derive";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { destinationEvidenceAuditPending, evidenceAuditOpeningV17, evidenceDestinationRulesV17,
  evidenceJobKeyV17, evidenceJobRecordWireV17, type EvidenceJobRecordV17 } from "../src/destination-evidence-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { destinationV17 } from "../src/destination-v17.ts";

// SCRIPTED entries and folded ports, using real canonical wire hashes.
// These exercise dispatch correspondence, not Native admission or authority.
const at = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
const fact = (seq: number, scope = otherLane): FactRef => ({ at: scope, seq, hash: d("a") });
function fixture(marked: number | null = null) {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, labels: [], roomService: null, checks: [
    { name: "unit", configuration: d("b"), required: true, checker: keys.una.member, audit: { check: "audit", every: 1 } },
    { name: "audit", configuration: d("b"), required: false, checker: keys.una.member, source: "room" },
  ], extents: [
    { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
    { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: ["unit"], class: "content" },
  ] });
  if (!proposed.ok) throw Error("The scripted same-configuration audit policy is invalid");
  const binding = { v: 1 as const, source: "member" as const, stage: "landing" as const, checker: keys.una.member,
    policyGeneration: { rules, seq: 10 }, roomService: null, serviceGeneration: { rules, seq: 0 }, auditOf: null,
    subject: { kind: "landing" as const, publication: fact(1, at), manifest: fact(2) } };
  const record: EvidenceJobRecordV17 = { v: 1, job: fact(10), name: "unit", configuration: d("b"), binding, bindingDigest: evidenceBindingDigest(binding),
    state: "admitted", admittedAt: 20, commit: "a".repeat(40), tree: "b".repeat(40), base: "c".repeat(40), sourceFacts: [], commitProof: null,
    policy: { rules, head: { seq: 11, hash: d("c") }, revision: 10, proposal: proposed.digest, policy: proposed.policy,
      certificate: { request: fact(5, at), certificate: fact(6, at), proof: d("d"), commit: "a".repeat(40) }, serviceGeneration: binding.serviceGeneration },
    reuseOwner: null, reuse: null, holdOwner: null, holds: [], policyOwner: null, incident: null, result: null, signer: null, decidedAt: null,
    reason: null, observedGeneration: binding.serviceGeneration, funded: { reuse: false, holds: false, policy: false, incident: false },
    countedJob: null, reuseRequested: false, deadline: t(60), forJob: null, noticeAt: null, holder: 7, requestAt: 15, covered: [] };
  const entry = (seq: number, kind: string, effects: Entry["effects"]): Entry => ({ v: 1, at, seq, prev: d("e"), time: t(0), clamped: false, epoch: 0,
    input: { type: "outcome", owner: "platform:destination@17", kind, operation: "15:0", attempt: 1, result: "confirmed", evidence: { basis: "own-answer", body: { job: record.job } } },
    uses: [], prepared: [], effects, sends: [] });
  const admission = entry(20, "evidence-admit", [
    { effect: "open", item: 20, type: "evidence-job", state: "job" }, { effect: "value", item: 20, slot: "record", value: evidenceJobRecordWireV17(record) },
    { effect: "attempt", operation: "15:0", attempt: 1, result: "confirmed", selected: true },
  ]);
  const progress = entry(30, "evidence-progress", [{ effect: "value", item: 20, slot: "auditOpenedAt", value: 30 },
    { effect: "operation", k: 0, owner: "platform:destination@17", kind: "evidence-audit", attempts: 1, for: 7 },
    { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null }]);
  const item: Item = { id: 20, type: "evidence-job", state: "job", revision: 30, opened: entryHash(admission), parties: {}, refs: {},
    values: { record: evidenceJobRecordWireV17(record), auditOpenedAt: marked }, attributed: [] };
  const operation: Operation = { id: "30:0", owner: "platform:destination@17", kind: "evidence-audit", most: 1, for: 7, selected: null,
    attempts: [{ attempt: 1, opened: 30, outcomes: [{ seq: 31, result: "unknown", evidence: d("f"), selected: null }] }] };
  const own = (seq: number) => seq === 20 ? { entry: admission, hash: entryHash(admission) } : seq === 30 ? { entry: progress, hash: entryHash(progress) } : null;
  const state = { item: (id: number) => id === 20 ? item : null, lookup: (type: string, index: string, key: string) =>
    type === "evidence-job" && index === "jobKey" && key === canonicalize(evidenceJobKeyV17(record.job)) ? [20] : [], operation: () => operation } as unknown as StateView;
  const given = { state, own, resolved: { at, self: 30, bounds: PROPOSED_BOUNDS } } as unknown as RuleGiven;
  return { record, item, operation, admission, progress, own, state, given };
}

test("the initial null audit marker opens one held dispatch and its unknown original never opens a replacement", () => {
  const initial = fixture(), retained = fixture(30);
  expect(evidenceAuditOpeningV17(initial.given, initial.item, initial.record)).toEqual({
    effects: [{ effect: "value", item: 20, slot: "auditOpenedAt", value: 30 }],
    opens: [{ owner: "platform:destination@17", kind: "evidence-audit", attempts: 1, for: 7 }],
  });
  expect(destinationEvidenceAuditPending(retained.state, retained.own, retained.operation)).toEqual({ job: retained.record.job });
  expect(evidenceAuditOpeningV17(retained.given, retained.item, retained.record)).toEqual({ effects: [], opens: [] });
  expect(destinationEvidenceAuditPending(retained.state, retained.own, { ...retained.operation, for: 8 })).toBeNull();
  if (retained.progress.input.type !== "outcome") throw Error("The scripted progress must be an outcome");
  const wrong: Entry = { ...retained.progress, input: { ...retained.progress.input, kind: "evidence-admit" } };
  expect(destinationEvidenceAuditPending(retained.state, seq => seq === 30 ? { entry: wrong, hash: entryHash(wrong) } : retained.own(seq), retained.operation)).toBeNull();
  expect(() => evidenceAuditOpeningV17({ ...retained.given, own: () => null }, retained.item, retained.record)).toThrow(RuleFault);
});

test("every counted evidence outcome declares one marked request rather than an uncounted callback request", () => {
  const data = destinationV17, rules = evidenceDestinationRulesV17({});
  for (const kind of ["admit", "result", "notice", "progress", "audit"]) {
    const mark = data.outcomes?.[`evidence-${kind}`];
    expect(mark).toMatchObject({ attempts: 1, send: { code: `evidence-${kind}-send-v17`, once: true, result: {} } });
    expect(rules[`evidence-${kind}-send-v17`]?.place).toBe("send");
  }
});

test("the admitted-job selector reads the maintained numeric local fact normal form and rejects a mismatching arriving reference", () => {
  const source = fixture(), admission = factRefOf(source.admission), types = destinationV17.acts["evidence-recover-timeout"]!.fields;
  const read = readFields(types, { admission }, PROPOSED_BOUNDS);
  if (!read.ok) throw Error("The actual declared admission field must fit");
  const normal = readFacts(source.state, types, read.fields, [], { at, own: source.own });
  if (normal.result !== "read") throw Error("The maintained local fact reader must resolve the sealed entry");
  expect(normal.fields["admission"]).toBe(source.admission.seq);
  const signed = signIntent({ v: 1, to: at, actor: keys.una.key, kind: "evidence-recover-timeout", on: 0, expected: { on: 0 }, fields: { admission },
    idempotencyKey: "SCRIPTED-local-fact", notAfter: t(60) }, keys.una.secret);
  const given: RuleGiven = { ...source.given, input: { type: "act", signed, grant: null, presented: {} },
    resolved: { ...source.given.resolved, fields: normal.fields } };
  const selector = evidenceDestinationRulesV17({})["evidence-admitted-job-v17"];
  if (selector?.place !== "also" || !("run" in selector)) throw Error("The actual admitted-job selector is absent");
  expect(selector.run(given, "evidence-job")).toBe(20);
  const wrong = { ...signed, intent: { ...signed.intent, fields: { admission: { ...admission, hash: d("f") } } } };
  expect(selector.run({ ...given, input: { type: "act", signed: wrong, grant: null, presented: {} } }, "evidence-job")).toBeNull();
  expect(selector.run({ ...given, resolved: { ...given.resolved, fields: { admission: 21 } } }, "evidence-job")).toBeNull();
});
