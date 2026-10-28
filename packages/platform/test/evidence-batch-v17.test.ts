import { expect, test } from "vitest";
import type { FactRef } from "@generalbusiness/dap-contract";
import { d, keys, otherLane } from "@generalbusiness/dap-derive/testing";
import { EVIDENCE_BATCH_JOBS_V17, claimEvidenceBatchJobV17, obligationChecksV17, readEvidenceBatchV17, selectEvidenceBatchV17, type EvidenceBatchRecordV17 } from "../src/evidence-batch-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13, type RulesCheckV13 } from "../src/rules-policy-v13.ts";
import type { ReservationPolicyViewV17 } from "../src/reservation-v17.ts";
import { RULES } from "./support-destination.ts";

// SCRIPTED policy views and source facts. These are pure account grammar
// and slot controls, not Native funding/admission or certificate authority.
const destination = { ...otherLane, kind: "destination" as const };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
const check = (name: string, extra: Partial<RulesCheckV13> = {}): RulesCheckV13 => ({ name, configuration: d("b"), required: true, checker: keys.una.member, ...extra });
function view(checks: readonly RulesCheckV13[], extentChecks: readonly string[] = []): ReservationPolicyViewV17 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, checks, labels: [], roomService: null,
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: [...extentChecks], class: "content" },
    ] });
  if (!proposed.ok) throw Error(`The scripted policy is invalid: ${proposed.reason}`);
  return { rules: RULES, head: { seq: 15, hash: d("c") }, revision: 10, proposal: proposed.digest, policy: proposed.policy,
    certificate: { request: fact(3, destination), certificate: fact(4, destination), proof: d("d"), commit: "a".repeat(40) },
    serviceGeneration: { rules: RULES, seq: 5 } };
}
function batches(policy: ReservationPolicyViewV17, touched: readonly string[] = ["source"]): EvidenceBatchRecordV17[] {
  const obligations = obligationChecksV17(policy.policy, touched);
  if (!obligations.ok) throw Error("The scripted obligations are invalid");
  const total = Math.ceil(obligations.checks.length / EVIDENCE_BATCH_JOBS_V17);
  return Array.from({ length: total }, (_, ordinal) => ({ v: 1, publication: fact(10, destination), operation: fact(8), capture: fact(20, destination),
    ordinal, total, touched: [...touched], checks: obligations.checks.slice(ordinal * 8, (ordinal + 1) * 8), policy, jobs: [], planAt: 30 + ordinal }));
}
const claim = (record: EvidenceBatchRecordV17, seq: number, name: string): EvidenceBatchRecordV17 => {
  const result = claimEvidenceBatchJobV17(record, fact(seq), name);
  if (!result.ok) throw Error(`The scripted claim was refused: ${result.reason}`);
  return result.record;
};

test("publication obligations include global/touched landing and published checks plus audit targets, retaining the complete policy", () => {
  const policy = view([
    check("member", { audit: { check: "audit", every: 1 } }), check("audit", { source: "room", required: false }),
    check("published-global", { stage: "published" }), check("published-extent", { stage: "published", required: false }),
    check("optional", { stage: "published", required: false }), check("work", { stage: "work" }),
  ], ["published-extent"]);
  const obligations = obligationChecksV17(policy.policy, ["source"]);
  expect(obligations.ok && obligations.checks.map(row => row.name)).toEqual(["audit", "member", "published-extent", "published-global"]);
  const record = readEvidenceBatchV17(batches(policy)[0]);
  expect(record?.policy.policy.checks.map(row => row.name)).toEqual(policy.policy.checks.map(row => row.name));
  expect(record?.policy.policy.checks).toHaveLength(6);
  expect(obligationChecksV17(policy.policy, ["unknown"])).toEqual({ ok: false });
  expect(obligationChecksV17(policy.policy, ["source", "source"])).toEqual({ ok: false });
});

test("all32 descriptors partition into four deterministic eight-slot accounts, without losing full policy", () => {
  const records = batches(view(Array.from({ length: 32 }, (_, n) => check(`c${String(n).padStart(2, "0")}`))));
  expect(records).toHaveLength(4);
  for (const [ordinal, record] of records.entries()) {
    expect(readEvidenceBatchV17(record)).not.toBeNull();
    expect(record.checks).toHaveLength(8);
    expect(record.policy.policy.checks).toHaveLength(32);
    expect(record.ordinal).toBe(ordinal);
  }
  expect(records.flatMap(row => row.checks.map(descriptor => descriptor.name))).toEqual(records[0]!.policy.policy.checks.map(row => row.name));
});

test("fresh repeats use spare slots while preserving a slot for every unclaimed descriptor", () => {
  let record = batches(view([check("a"), check("b"), check("c")]))[0]!;
  record = claim(record, 40, "a");
  for (let seq = 41; seq <= 45; seq++) record = claim(record, seq, "a");
  expect(record.jobs).toHaveLength(6);
  expect(claimEvidenceBatchJobV17(record, fact(46), "a")).toEqual({ ok: false, reason: "batch-full" });
  record = claim(claim(record, 47, "b"), 48, "c");
  expect(record.jobs).toHaveLength(8);
  expect(claimEvidenceBatchJobV17(record, fact(49), "a")).toEqual({ ok: false, reason: "batch-full" });
  expect(claimEvidenceBatchJobV17(record, fact(40), "a")).toEqual({ ok: true, record });
  expect(claimEvidenceBatchJobV17(record, fact(40), "b")).toEqual({ ok: false, reason: "batch-invalid" });
  expect(claimEvidenceBatchJobV17(record, { ...fact(40), hash: d("f") }, "a")).toEqual({ ok: false, reason: "batch-invalid" });
});

test("a full eight-descriptor account cannot spend another descriptor's reserved slot on a repeated check", () => {
  const record = claim(batches(view(Array.from({ length: 8 }, (_, n) => check(`c${n}`))))[0]!, 40, "c0");
  expect(claimEvidenceBatchJobV17(record, fact(41), "c0")).toEqual({ ok: false, reason: "batch-full" });
  expect(claimEvidenceBatchJobV17(record, fact(41), "c1").ok).toBe(true);
});

test("selection proves complete consistent accounts, exact descriptor ownership and unique existing job", () => {
  const records = batches(view(Array.from({ length: 9 }, (_, n) => check(`c${n}`))));
  const selected = selectEvidenceBatchV17([...records].reverse(), fact(40), "c8");
  expect(selected.ok && selected.record.ordinal).toBe(1);
  records[1] = claim(records[1]!, 40, "c8");
  expect(selectEvidenceBatchV17(records, fact(40))).toEqual({ ok: true, record: records[1] });
  expect(selectEvidenceBatchV17(records, fact(40), "c0")).toEqual({ ok: false, reason: "batch-invalid" });
  expect(selectEvidenceBatchV17([records[0]!], fact(41), "c0")).toEqual({ ok: false, reason: "batch-invalid" });
  expect(selectEvidenceBatchV17([records[0]!, records[0]!], fact(41), "c0")).toEqual({ ok: false, reason: "batch-invalid" });
  expect(selectEvidenceBatchV17([claim(records[0]!, 40, "c0"), records[1]!], fact(40))).toEqual({ ok: false, reason: "batch-invalid" });
});

test("closed records refuse altered partitions, frozen policy metadata and borrowed publication identities", () => {
  const record = batches(view([check("a"), check("b")]))[0]!;
  for (const changed of [
    { ...record, checks: [record.checks[0]!] }, { ...record, total: 2 }, { ...record, touched: ["unknown"] },
    { ...record, policy: { ...record.policy, proposal: d("f") } }, { ...record, capture: fact(20) },
    { ...record, planAt: 19 }, { ...record, extra: true },
    { ...record, jobs: [{ job: fact(40), name: "unknown" }] },
    { ...record, jobs: [{ job: fact(40), name: "a" }, { job: fact(40), name: "a" }] },
  ]) expect(readEvidenceBatchV17(changed)).toBeNull();
  const accessor = { ...record };
  Object.defineProperty(accessor, "jobs", { enumerable: true, get: () => { throw Error("An accessor is not retained data"); } });
  expect(readEvidenceBatchV17(accessor)).toBeNull();
});
