import { expect, test } from "vitest";
import type { FactRef, KeyId } from "@generalbusiness/dap-contract";
import type { EvidenceBinding } from "../src/evidence.ts";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { keys, otherLane, d } from "@generalbusiness/dap-derive/testing";
import { NOTHING } from "@generalbusiness/dap-derive";
import { assessEvidenceV17, evidenceCapacityV17, evidenceKeyDigestV17, newEvidenceIndexV17, readEvidenceIndexV17, releaseEvidenceCandidateV17, reserveEvidenceCandidateV17, reserveEvidenceCountsV17, settleEvidenceCandidateV17, type EvidenceCandidateV17, type EvidenceIndexRecordV17, type EvidenceKeyV17 } from "../src/evidence-index-v17.ts";

// Every fact and authority choice below is scripted. These are the actual pure
// bounded records and decisions, not a Native admission or key observation.
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
const ruleScope = { ...otherLane, kind: "rules" as const };
const key: EvidenceKeyV17 = { room: { ...otherLane, kind: "destination" }, tree: "a".repeat(40), name: "verify", configuration: d("b"), source: "member", stage: "landing" };
const binding: EvidenceBinding = { v: 1, source: "member", stage: "landing", checker: keys.una.member,
  policyGeneration: { rules: ruleScope, seq: 1 }, roomService: null, serviceGeneration: { rules: ruleScope, seq: 0 }, auditOf: null,
  subject: { kind: "landing", publication: { ...fact(1), at: key.room }, manifest: fact(2) } };
const candidate = (seq: number, signingKey: KeyId, outcome: EvidenceCandidateV17["outcome"]): EvidenceCandidateV17 => ({
  job: fact(seq), keyDigest: evidenceKeyDigestV17(key), admission: seq + 100, result: fact(seq + 20), decidedBy: seq + 101, key: signingKey, checker: keys.una.member, binding, outcome,
});
function reserved(record: EvidenceIndexRecordV17, job: FactRef): EvidenceIndexRecordV17 {
  const result = reserveEvidenceCandidateV17(record, job, 32768); if (!result.ok) throw Error("Fixture reservation refused"); return result.record;
}
function settled(record: EvidenceIndexRecordV17, row: EvidenceCandidateV17, eligible: (candidate: EvidenceCandidateV17) => boolean): EvidenceIndexRecordV17 {
  const result = settleEvidenceCandidateV17(reserved(record, row.job), row, eligible); if (!result.ok) throw Error("Fixture result refused"); return result.record;
}

test("key rotation preserves earlier candidates; one current predicate compares both outcomes and disagreement stays disabled", () => {
  const oldPass = candidate(3, keys.una.key, "passed"), newFailure = candidate(4, keys.vic.key, "failed");
  let record = settled(newEvidenceIndexV17(key)!, oldPass, row => row.key === keys.una.key);
  record = settled(record, newFailure, row => row.key === keys.vic.key);
  expect(record.candidates).toHaveLength(2);
  expect(assessEvidenceV17(record, row => row.key === keys.vic.key)).toMatchObject({ reusable: null, conflicted: false });
  const restored = assessEvidenceV17(record, row => row.key === keys.una.key)!;
  expect(restored.reusable?.result).toEqual(oldPass.result);
  const conflict = assessEvidenceV17(record, () => true)!;
  expect(conflict).toMatchObject({ reusable: null, conflicted: true, record: { conflict: { passed: oldPass.result, failed: newFailure.result } } });
  expect(assessEvidenceV17(conflict.record, row => row.key === keys.una.key)).toMatchObject({ reusable: null, conflicted: true });
  const fresh = reserveEvidenceCandidateV17(conflict.record, fact(99), 0);
  expect(fresh).toEqual({ ok: true, record: conflict.record });
  expect(evidenceKeyDigestV17({ ...key })).toBe(evidenceKeyDigestV17(record.key));
});

test("every fresh or audit candidate consumes a reservation; eight slots refuse a ninth without evicting a result", () => {
  let record = newEvidenceIndexV17(key)!;
  for (let seq = 1; seq <= 8; seq++) record = reserved(record, fact(seq));
  expect(reserveEvidenceCandidateV17(record, fact(9), 32768)).toEqual({ ok: false, reason: "evidence-capacity", resource: "reuse-candidates" });
  expect(reserveEvidenceCandidateV17(record, fact(8), 32768)).toEqual({ ok: true, record });
  expect(settleEvidenceCandidateV17(record, candidate(9, keys.una.key, "passed"), () => true)).toEqual({ ok: false, reason: "evidence-not-reserved" });
  const audit = { ...candidate(1, keys.una.key, "passed"), binding: { ...binding, auditOf: fact(90) } };
  const ended = settleEvidenceCandidateV17(record, audit, () => true);
  expect(ended.ok && ended.record.pending).toHaveLength(7);
  expect(ended.ok && ended.record.candidates).toHaveLength(1);
  const released = releaseEvidenceCandidateV17(record, fact(8));
  expect(released.ok && released.record.pending).toHaveLength(7);
  expect(reserveEvidenceCandidateV17(newEvidenceIndexV17(key)!, fact(1), 1)).toEqual({ ok: false, reason: "evidence-capacity", resource: "reuse-record" });
  expect(newEvidenceIndexV17({ ...key, stage: "published" })).toBeNull();
});

test("retained records are owned and closed; another source or a second result for one job cannot replace provenance", () => {
  const passed = candidate(3, keys.una.key, "passed"), record = settled(newEvidenceIndexV17(key)!, passed, () => true);
  expect(settleEvidenceCandidateV17(record, { ...passed, result: fact(99) }, () => true)).toEqual({ ok: false, reason: "evidence-result-conflict" });
  expect(readEvidenceIndexV17({ ...record, key: { ...key, source: "room" } })).toBeNull();
  expect(readEvidenceIndexV17({ ...record, key: { ...key, tree: "b".repeat(40) } })).toBeNull();
  expect(readEvidenceIndexV17({ ...record, unexpected: true })).toBeNull();
  let accessorReads = 0;
  const accessor = { ...record };
  Object.defineProperty(accessor, "candidates", { enumerable: true, get: () => { accessorReads++; return record.candidates; } });
  expect(readEvidenceIndexV17(accessor)).toBeNull();
  expect(accessorReads).toBe(0);
  const read = readEvidenceIndexV17(record)!;
  (record.key as { name: string }).name = "changed";
  expect(read.key.name).toBe("verify");
});

test("capacity counts pending work in every dimension and rejects malformed operands before arithmetic", () => {
  const zero = { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 };
  expect(reserveEvidenceCountsV17({ ...zero, keys: 2047 }, { ...zero, keys: 1 })).toEqual({ ok: true, counts: { ...zero, keys: 2048 } });
  expect(reserveEvidenceCountsV17({ ...zero, keys: 2048 }, { ...zero, keys: 1 })).toEqual({ ok: false, reason: "evidence-capacity", resource: "keys" });
  expect(reserveEvidenceCountsV17(zero, { ...zero, holds: -0 })).toEqual({ ok: false, reason: "evidence-invalid" });
  expect(reserveEvidenceCountsV17({ ...zero, keys: 2048 }, { ...zero, keys: 1, incidents: Number.NaN })).toEqual({ ok: false, reason: "evidence-invalid" });
  for (const [resource, limit] of [["holds", 512], ["policyGenerations", 512], ["incidents", 8192]] as const) {
    expect(reserveEvidenceCountsV17({ ...zero, [resource]: limit }, { ...zero, [resource]: 1 })).toEqual({ ok: false, reason: "evidence-capacity", resource });
  }
  const quote = { used: { ...NOTHING }, pending: { ...NOTHING, requests: PROPOSED_BOUNDS.scopeRequests }, write: { ...NOTHING }, future: { ...NOTHING }, carryingEntryBytes: PROPOSED_BOUNDS.entryBytes, maximumSettlementEntryBytes: PROPOSED_BOUNDS.entryBytes };
  expect(evidenceCapacityV17(quote, PROPOSED_BOUNDS)).toMatchObject({ ok: true });
  expect(evidenceCapacityV17({ ...quote, future: { ...NOTHING, requests: 1 } }, PROPOSED_BOUNDS)).toEqual({ ok: false, reason: "evidence-capacity", resource: "scopeRequests" });
  expect(evidenceCapacityV17({ ...quote, maximumSettlementEntryBytes: PROPOSED_BOUNDS.entryBytes + 1 }, PROPOSED_BOUNDS)).toEqual({ ok: false, reason: "evidence-capacity", resource: "entryBytes" });
  for (const amount of [{ ...NOTHING, bytes: -1 }, { ...NOTHING, records: -0 }, { ...NOTHING, entries: Number.MAX_SAFE_INTEGER }]) {
    expect(evidenceCapacityV17({ ...quote, used: amount, pending: { ...NOTHING, entries: 1 } }, PROPOSED_BOUNDS)).toEqual({ ok: false, reason: "evidence-invalid" });
  }
});
