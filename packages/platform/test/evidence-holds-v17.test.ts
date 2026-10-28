import { expect, test } from "vitest";
import type { FactRef, MemberId } from "@generalbusiness/dap-contract";
import { d, otherLane } from "@generalbusiness/dap-derive/testing";
import { compareEvidenceOrderV17, decideEvidenceIncidentV17, evidenceHoldActiveV17, evidenceTriagersV17, failEvidenceHoldV17, finishEvidenceIncidentV17, newEvidenceHoldV17, passEvidenceHoldV17, readEvidenceFailureV17, releaseEvidenceHoldV17, reserveEvidenceIncidentV17, startEvidenceIncidentV17, type EvidenceFailureV17, type EvidenceHoldKeyV17, type EvidenceHoldRecordV17, type EvidencePassReleaseV17 } from "../src/evidence-holds-v17.ts";

// Scripted facts and eligibility choices exercise the actual pure order/state
// decisions; no job, publication, holder observation, or creation runs here.
const destination = { ...otherLane, kind: "destination" as const }, membership = { ...otherLane, kind: "membership" as const };
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
const publication = (seq: number): FactRef => ({ ...fact(seq), at: destination });
const key: EvidenceHoldKeyV17 = { generation: { rules: { ...otherLane, kind: "rules" }, seq: 1 }, extent: "source", name: "published", configuration: d("b"), source: "room", stage: "published" };
const failure = (pub: number, job = pub + 1, kind: EvidenceFailureV17["kind"] = "failed"): EvidenceFailureV17 => ({ job: fact(job + 50), publication: publication(pub), commit: "a".repeat(40), order: { publication: pub, job }, decidedAt: job + 1, kind, reason: kind, result: kind === "failed" ? fact(job + 100) : null });
const passed = (pub: number, job = pub + 1): EvidencePassReleaseV17 => ({ kind: "pass", decidedAt: job + 2, through: { publication: pub, job }, job: fact(job + 50), publication: publication(pub), result: fact(job + 100) });
function failed(record: EvidenceHoldRecordV17, cause: EvidenceFailureV17): EvidenceHoldRecordV17 {
  const changed = failEvidenceHoldV17(record, cause); if (!changed.ok) throw Error("Fixture hold refused"); return changed.record;
}

test("native publication and admitted-job order defeats duplicates, reordered failure, and an earlier pass", () => {
  const first = failure(10), record = failed(newEvidenceHoldV17(key)!, first);
  expect(evidenceHoldActiveV17(record)).toBe(true);
  expect(failEvidenceHoldV17(record, first)).toEqual({ ok: true, record });
  const old = passEvidenceHoldV17(record, key, passed(5), true);
  expect(old.ok && evidenceHoldActiveV17(old.record)).toBe(true);
  const released = passEvidenceHoldV17(record, key, passed(10, 12), true);
  if (!released.ok) throw Error("Fixture pass refused");
  expect(evidenceHoldActiveV17(released.record)).toBe(false);
  const reordered = failed(released.record, failure(7));
  expect(evidenceHoldActiveV17(reordered)).toBe(false);
  expect(compareEvidenceOrderV17({ publication: 10, job: 12 }, { publication: 10, job: 11 })).toBe(1);
  expect(evidenceHoldActiveV17(failed(reordered, failure(11, 20)))).toBe(true);
});

test("only a current eligible exact-key pass clears; override and transition remain their actual acts", () => {
  const record = failed(newEvidenceHoldV17(key)!, failure(10));
  expect(passEvidenceHoldV17(record, { ...key, configuration: d("c") }, passed(12), true)).toEqual({ ok: false, reason: "hold-key-mismatch" });
  expect(passEvidenceHoldV17(record, { ...key, generation: { ...key.generation, seq: 2 } }, passed(12), true)).toEqual({ ok: false, reason: "hold-key-mismatch" });
  expect(passEvidenceHoldV17(record, key, passed(12), false)).toEqual({ ok: false, reason: "hold-pass-ineligible" });
  const override = releaseEvidenceHoldV17(record, { kind: "override", decidedAt: 20, through: record.failure!.order, reason: "authorized recovery" });
  expect(override.ok && override.record.release?.kind).toBe("override");
  expect(override.ok && evidenceHoldActiveV17(override.record)).toBe(false);
  const transition = releaseEvidenceHoldV17(record, { kind: "transition", decidedAt: 20, through: record.failure!.order, reason: "adopt new generation", next: { ...key.generation, seq: 2 } });
  expect(transition.ok && transition.record.release?.kind).toBe("transition");
  for (const kind of ["error", "timeout", "unknown", "observation-unavailable"] as const) {
    const cause = failure(10, 11, kind), held = failed(newEvidenceHoldV17(key)!, cause);
    expect(evidenceHoldActiveV17(held)).toBe(true);
    expect(held.failure?.kind).toBe(kind);
    expect(held.failure?.result).toBeNull();
  }
  const timed = failed(newEvidenceHoldV17(key)!, failure(10, 11, "timeout"));
  const lateFailed = failed(timed, { ...failure(10, 11), decidedAt: 20 });
  expect(lateFailed.failure).toMatchObject({ kind: "failed", decidedAt: 20, result: fact(111) });
  expect(readEvidenceFailureV17({ ...failure(10, 11, "timeout"), result: fact(99) })).toBeNull();
});

test("triager completeness never truncates an over-bound or unknown set", () => {
  const holders = Array.from({ length: 32 }, (_, index) => `@triager${index}` as MemberId);
  expect(evidenceTriagersV17({ of: membership, action: "issue.triage", count: 32, holders })).toMatchObject({ ok: true, triagers: expect.any(Array) });
  expect(evidenceTriagersV17({ of: membership, action: "issue.triage", count: 33, holders })).toEqual({ ok: false, reason: "triagers-over-bound" });
  expect(evidenceTriagersV17({ of: membership, action: "issue.triage", count: 2, holders: holders.slice(0, 1) })).toEqual({ ok: false, reason: "triagers-unavailable" });
  expect(evidenceTriagersV17({ of: membership, action: "issue.triage", count: 0, holders: [] })).toEqual({ ok: false, reason: "triagers-empty" });
});

test("a truthful native timeout cause and unknown creation retain one original incident envelope", () => {
  const cause = failure(10, 11, "timeout"), reserved = reserveEvidenceIncidentV17(cause.job)!;
  const decided = decideEvidenceIncidentV17(reserved, cause); if (!decided.ok) throw Error("Fixture native decision refused");
  expect(decided.incident.cause).toMatchObject({ kind: "timeout", result: null });
  const creation = { at: otherLane, seq: 80, n: 0 }, started = startEvidenceIncidentV17(decided.incident, creation);
  if (!started.ok) throw Error("Fixture creation refused");
  expect(finishEvidenceIncidentV17(started.incident, creation, { state: "unknown" })).toEqual({ ok: true, incident: started.incident });
  expect(startEvidenceIncidentV17(started.incident, { ...creation, seq: 81 })).toEqual({ ok: false, reason: "incident-conflict" });
  const child = { ...otherLane, inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" as const };
  const created = finishEvidenceIncidentV17(started.incident, creation, { state: "created", child });
  expect(created.ok && created.incident.state).toBe("created");
  expect(decideEvidenceIncidentV17(started.incident, { ...cause, kind: "failed", result: fact(99) })).toEqual({ ok: false, reason: "incident-conflict" });
});
