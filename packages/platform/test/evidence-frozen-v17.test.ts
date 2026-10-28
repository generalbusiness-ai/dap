import { expect, test } from "vitest";
import type { EvidenceBinding, FactRef, ServiceMark } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { d, keys, otherLane } from "@generalbusiness/dap-derive/testing";
import { evidenceFrozenBatchMatchesV17 } from "../src/destination-evidence-v17.ts";
import { obligationChecksV17, readEvidenceBatchV17, type EvidenceBatchRecordV17 } from "../src/evidence-batch-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { checkSourceV13, checkStageV13, rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import { RULES } from "./support-destination.ts";

// SCRIPTED facts and policy metadata. The maintained semantic readers build
// valid batch values, not Native publication/capture or current authority.
// The Native wrapper separately proves its actual holder/capture/operation.
const destination = { ...otherLane, kind: "destination" as const };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
const mark: ServiceMark = { checker: keys.una.member, key: keys.una.key };
function batch(revision = 10, service = 5, roomService: ServiceMark | null = mark): EvidenceBatchRecordV17 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, labels: [], roomService,
    checks: [
      { name: "member", configuration: d("b"), required: true, checker: keys.una.member, audit: { check: "audit", every: 1 } },
      { name: "audit", configuration: d("b"), required: false, checker: keys.una.member, source: "room" },
      { name: "published", configuration: d("c"), required: true, checker: keys.una.member, source: "room", stage: "published", holds: true },
      { name: "work", configuration: d("d"), required: true, checker: keys.una.member, stage: "work" },
    ], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: ["member", "published"], class: "content" },
    ] });
  if (!proposed.ok) throw Error(`The scripted policy is invalid: ${proposed.reason}`);
  const checks = obligationChecksV17(proposed.policy, ["source"]);
  if (!checks.ok) throw Error("The scripted obligations are invalid");
  const value = readEvidenceBatchV17({ v: 1, publication: fact(10, destination), operation: fact(8), capture: fact(20, destination),
    ordinal: 0, total: 1, touched: ["source"], checks: checks.checks, policy: { rules: RULES, head: { seq: revision + 1, hash: d("e") },
      revision, proposal: proposed.digest, policy: proposed.policy, certificate: { request: fact(3, destination), certificate: fact(4, destination), proof: d("f"), commit: "a".repeat(40) },
      serviceGeneration: { rules: RULES, seq: service } }, jobs: [], planAt: 30 });
  if (!value) throw Error("The scripted batch is invalid");
  return value;
}
function binding(value: EvidenceBatchRecordV17, name = "member"): EvidenceBinding {
  const check = value.checks.find(check => check.name === name);
  if (!check) throw Error("The scripted descriptor is absent");
  const stage = checkStageV13(check);
  if (stage === "work") throw Error("Publication batches contain no work obligation");
  return { v: 1, source: checkSourceV13(check), stage, checker: check.checker,
    policyGeneration: { rules: value.policy.rules, seq: value.policy.revision }, roomService: value.policy.policy.roomService,
    serviceGeneration: value.policy.serviceGeneration, auditOf: name === "audit" ? fact(40) : null,
    subject: stage === "published" ? { kind: "published", publication: value.publication, receipt: fact(31, destination), written: fact(32, destination), manifest: fact(2) }
      : { kind: "landing", publication: value.publication, manifest: fact(2) } };
}

test("exact frozen member, room-audit and published descriptors match without mutating their semantic batch", () => {
  const frozen = batch(), before = canonicalize(frozen);
  for (const name of ["member", "audit", "published"]) {
    const check = frozen.checks.find(check => check.name === name)!;
    expect(evidenceFrozenBatchMatchesV17(binding(frozen, name), name, check.configuration, frozen)).toBe(true);
  }
  expect(canonicalize(frozen)).toBe(before);
});

test("a newer current-policy binding for the same publication cannot replace the captured generation", () => {
  const frozen = batch(), newer = batch(11, 6, { ...mark, key: keys.vic.key });
  expect(newer.publication).toEqual(frozen.publication);
  const next = binding(newer, "audit");
  expect(evidenceFrozenBatchMatchesV17(next, "audit", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17(next, "audit", d("b"), newer)).toBe(true);
  // Frozen correspondence alone does not authenticate the current policy:
  // this predicate has no current observation; that is a separate guard.
  expect(evidenceFrozenBatchMatchesV17(binding(frozen, "audit"), "audit", d("b"), frozen)).toBe(true);
});

test("full Rules generation, service generation and mark must remain the captured identities", () => {
  const frozen = batch(), original = binding(frozen);
  const changed: EvidenceBinding[] = [
    { ...original, policyGeneration: { ...original.policyGeneration, seq: 11 } },
    { ...original, policyGeneration: { ...original.policyGeneration, rules: { ...RULES, inc: otherLane.inc } } },
    { ...original, serviceGeneration: { ...original.serviceGeneration, seq: 6 } },
    { ...original, serviceGeneration: { ...original.serviceGeneration, rules: { ...RULES, inc: otherLane.inc } } },
    { ...original, roomService: { ...mark, key: keys.vic.key } },
    { ...original, roomService: { ...mark, checker: keys.vic.member } },
    { ...original, roomService: null },
  ];
  for (const candidate of changed) expect(evidenceFrozenBatchMatchesV17(candidate, "member", d("b"), frozen)).toBe(false);
});

test("the exact descriptor fixes source, stage, checker, name and configuration, with no duplicate-name fallback", () => {
  const frozen = batch(), original = binding(frozen);
  expect(evidenceFrozenBatchMatchesV17({ ...original, source: "room" }, "member", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17({ ...original, stage: "published", subject: { kind: "published", publication: frozen.publication,
    receipt: fact(31, destination), written: fact(32, destination), manifest: fact(2) } }, "member", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17({ ...original, checker: keys.vic.member }, "member", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17(original, "missing", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17(original, "member", d("c"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17(original, "member", d("b"), { ...frozen, checks: [...frozen.checks, frozen.checks.find(check => check.name === "member")!] })).toBe(false);
});

test("publication identity includes its hash and incarnation, while work is outside this predicate", () => {
  const frozen = batch(), original = binding(frozen), subject = original.subject;
  if (subject.kind === "work") throw Error("The scripted binding is a landing");
  for (const publication of [
    { ...subject.publication, seq: 11 }, { ...subject.publication, hash: d("b") },
    { ...subject.publication, at: { ...destination, inc: RULES.inc } },
  ]) expect(evidenceFrozenBatchMatchesV17({ ...original, subject: { ...subject, publication } }, "member", d("b"), frozen)).toBe(false);
  expect(evidenceFrozenBatchMatchesV17({ ...original, stage: "work", subject: { kind: "work", source: fact(2) } }, "work", d("d"), frozen)).toBe(false);
});
