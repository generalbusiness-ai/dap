import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Bounds, type FactRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { CheckStage, EvidenceBinding } from "../src/evidence.ts";
import { keys, otherLane, d, t } from "@generalbusiness/dap-derive/testing";
import type { RuleGiven } from "@generalbusiness/dap-derive";
import type { EvidenceJobRecordV17 } from "../src/destination-evidence-v17.ts";
import { evidenceFutureEntriesV17 } from "../src/evidence-forecast-v17.ts";
import { evidenceWireV17 } from "../src/evidence-wire-v17.ts";
import { newEvidenceIndexV17 } from "../src/evidence-index-v17.ts";
import { newEvidenceHoldV17 } from "../src/evidence-holds-v17.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import type { ReservationPolicyViewV17 } from "../src/reservation-v17.ts";
import { RULES } from "./support-destination.ts";

// SCRIPTED source facts, policy views, state and records. Forecast maxima
// are not real facts or Native funding/capacity/execution evidence.
const destination = { ...otherLane, kind: "destination" as const };
const fact = (seq: number, at = otherLane): FactRef => ({ at, seq, hash: d("a") });
function policy(stage: CheckStage, count = 1): ReservationPolicyViewV17 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, labels: [], roomService: null,
    checks: Array.from({ length: count }, (_, n) => ({ name: `c${n}`, configuration: d("b"), required: true, checker: keys.una.member, stage })),
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: ["c0"], class: "content" },
    ] });
  if (!proposed.ok) throw Error(`The scripted policy is invalid: ${proposed.reason}`);
  return { rules: RULES, head: { seq: 15, hash: d("c") }, revision: 10, proposal: proposed.digest, policy: proposed.policy,
    certificate: { request: fact(3, destination), certificate: fact(4, destination), proof: d("d"), commit: "a".repeat(40) },
    serviceGeneration: { rules: RULES, seq: 5 } };
}
function record(stage: CheckStage = "work", count = 1): EvidenceJobRecordV17 {
  const view = policy(stage, count);
  const subject: EvidenceBinding["subject"] = stage === "work" ? { kind: "work", source: fact(2) }
    : stage === "landing" ? { kind: "landing", publication: fact(1, destination), manifest: fact(2) }
      : { kind: "published", publication: fact(1, destination), manifest: fact(2), receipt: fact(3, destination), written: fact(4, destination) };
  const binding: EvidenceBinding = { v: 1, source: "member", stage, checker: keys.una.member,
    policyGeneration: { rules: RULES, seq: 10 }, roomService: null, serviceGeneration: view.serviceGeneration, auditOf: null, subject };
  return { v: 1, job: fact(10), name: "c0", configuration: d("b"), binding, bindingDigest: d("e"), state: "admitted", admittedAt: 12,
    commit: "a".repeat(40), tree: "b".repeat(40), base: "c".repeat(40), sourceFacts: [fact(2)], commitProof: d("f"), policy: view,
    reuseOwner: null, reuse: null, holdOwner: null, holds: [], covered: [], policyOwner: null, incident: stage === "published"
      ? { job: fact(10), cause: null, state: "reserved", creation: null, child: null, reason: null } : null,
    result: null, signer: null, decidedAt: null, reason: null, observedGeneration: view.serviceGeneration,
    funded: { reuse: false, holds: false, policy: false, incident: stage === "published" }, countedJob: null, reuseRequested: false,
    deadline: t(60), forJob: null, noticeAt: null, holder: 5, requestAt: 6 };
}
function given(row: EvidenceJobRecordV17, over: Partial<Bounds> = {}): RuleGiven {
  const source = { resolved: { at: destination, bounds: { ...PROPOSED_BOUNDS, derivedEffects: 16, ...over } }, uses: [],
    state: { item: () => ({ values: { passes: evidenceWireV17({ policy: { required: row.policy!.policy.checks,
      input: { extents: { policy: row.policy!.policy } } }, generations: [] }, 196608) } }) } };
  Object.defineProperty(source, "input", { get: () => { throw Error("The current input is not a future input"); } });
  return source as unknown as RuleGiven;
}
const quote = (row: EvidenceJobRecordV17, over: Partial<Bounds> = {}) => evidenceFutureEntriesV17(given(row, over), { item: 12, record: row }, [], () => null);

test("quotes fresh future shells without reading the current input, and enforces byte/effect ceilings", () => {
  const row = record(), before = canonicalize(row), baseline = quote(row);
  expect(baseline.admitted).toBe(true);
  expect(baseline.entryBytes).toBeGreaterThan(0);
  expect(baseline.effects).toBe(6);
  expect(quote(row, { entryBytes: baseline.entryBytes - 1 })).toMatchObject({ admitted: false, entryBytes: baseline.entryBytes });
  expect(quote(row, { derivedEffects: 5 })).toMatchObject({ admitted: false, effects: 6 });
  expect(quote(row, { usesPerEntry: 5 }).admitted).toBe(true);
  expect(quote(row, { usesPerEntry: 4 }).admitted).toBe(false);
  expect(canonicalize(row)).toBe(before);
});

test("completes pending candidate bindings through bounded lookups and refuses missing frozen sources", () => {
  const row = record(), bucket = newEvidenceIndexV17({ room: destination, tree: row.tree!, name: row.name, configuration: row.configuration, source: "member", stage: "work" })!;
  row.reuse = { ...bucket, pending: [row.job, fact(11)] }; row.reuseOwner = 12;
  expect(quote(row).admitted).toBe(false);
  const requests: FactRef[] = [];
  const answer = evidenceFutureEntriesV17(given(row), { item: 12, record: row }, [], job => {
    requests.push(job); return { ...row, job, reuse: null };
  });
  expect(answer.admitted).toBe(true);
  expect(requests).toEqual([fact(11)]);
  const tooMany = { ...row, reuse: { ...row.reuse!, pending: Array.from({ length: 9 }, (_, n) => fact(n + 20)) } };
  expect(quote(tooMany).admitted).toBe(false);
});

test("distinct reuse owner and separate publication progress include automatic attempt and funded opening pairs", () => {
  const row = record("landing"), owner = { ...row, job: fact(5) };
  owner.reuse = { ...newEvidenceIndexV17({ room: destination, tree: row.tree!, name: row.name, configuration: row.configuration, source: "member", stage: "landing" })!, pending: [row.job] };
  row.reuseOwner = 99;
  expect(quote(row).admitted).toBe(false);
  const answer = evidenceFutureEntriesV17(given(row), { item: 12, record: row }, [{ item: 99, record: owner }], () => null);
  expect(answer.admitted).toBe(true);
  expect(answer.effects).toBe(10);
  expect(evidenceFutureEntriesV17(given(row), { item: 12, record: row }, [{ item: 12, record: owner }], () => null).admitted).toBe(false);
});

test("progress quotes its full signer cohort and all32 configured proof rows, refusing an unproved carrying ceiling", () => {
  const one = record("landing"), all = record("landing", 32);
  const small = quote(one), complete = quote(all);
  expect(small.admitted).toBe(true);
  expect(complete.entryBytes).toBeGreaterThan(small.entryBytes);
  expect(complete.effects).toBe(small.effects);
  expect(complete.entryBytes).toBeGreaterThan(PROPOSED_BOUNDS.entryBytes);
  expect(complete.admitted).toBe(false);
  expect(quote(one, { entryBytes: small.entryBytes - 1 })).toMatchObject({ admitted: false, entryBytes: small.entryBytes });
});

test("hold forecasts include future failure, escaped1024-byte transition reasons and a full incident message", () => {
  const row = record("published"), plain = quote(row, { entryBytes: 1000000 });
  row.holds = Array.from({ length: 8 }, (_, n) => newEvidenceHoldV17({ generation: row.binding.policyGeneration, extent: `extent${n}`,
    name: row.name, configuration: row.configuration, source: "member", stage: "published" })!);
  row.holdOwner = 12;
  const withHolds = quote(row, { entryBytes: 1000000 });
  expect(plain.admitted).toBe(true);
  expect(withHolds.admitted).toBe(true);
  expect(withHolds.entryBytes - plain.entryBytes).toBeGreaterThan(8 * 1024 * 6);
  expect(quote(row, { entryBytes: withHolds.entryBytes - 1 }).admitted).toBe(false);
});

test("over-bound code records and absent admitted triples refuse before a future entry can be promised", () => {
  const row = record();
  expect(quote({ ...row, reason: "\u0000".repeat(40000) }).admitted).toBe(false);
  expect(quote({ ...row, policy: null }).admitted).toBe(false);
  expect(quote({ ...row, commit: null }).admitted).toBe(false);
});

test("future carrying bytes include the outer JSON escaping of canonical code text", () => {
  const row = record(), ascii = quote({ ...row, reason: "a".repeat(1024) }), escaped = quote({ ...row, reason: "\\".repeat(1024) });
  expect(ascii.admitted).toBe(true);
  expect(escaped.admitted).toBe(true);
  // One record slot: a literal backslash becomes two in the code text,
  // then four in its containing Entry, versus one byte for ASCII 'a'.
  expect(escaped.entryBytes - ascii.entryBytes).toBe(3 * 1024);
  expect(quote({ ...row, reason: "\\".repeat(1024) }, { entryBytes: escaped.entryBytes - 1 }).admitted).toBe(false);
});
