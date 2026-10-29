import { expect, test } from "vitest";
import type { FactRef, MemberId } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { d, otherLane } from "@generalbusiness/dap-derive/testing";
import { compareEvidenceOrderV17, decideEvidenceIncidentV17, evidenceHoldActiveV17, evidenceTriagersV17, failEvidenceHoldV17, finishEvidenceIncidentV17, newEvidenceHoldV17, passEvidenceHoldV17, readEvidenceFailureV17, releaseEvidenceHoldV17, reserveEvidenceIncidentV17, startEvidenceIncidentV17, type EvidenceFailureV17, type EvidenceHoldKeyV17, type EvidenceHoldRecordV17, type EvidencePassReleaseV17 } from "../src/evidence-holds-v17.ts";
import { bindEvidenceHoldPendingV17, clearEvidenceHoldPendingV17, effectiveEvidenceHoldV17, readEvidenceHoldPendingV17, removeEvidenceHoldPendingV17,
  reserveEvidenceHoldPendingV17, withdrawEvidenceHoldPendingV17, type EvidenceHoldPendingChangeV17, type EvidenceHoldPendingV17 } from "../src/evidence-holds-v17.ts";

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

const pendingOf = (answer: EvidenceHoldPendingChangeV17): readonly EvidenceHoldPendingV17[] => {
  if (!answer.ok) throw Error(`Scripted pending change refused: ${answer.reason}`);
  return answer.pending;
};
const unbound = (pub: number): EvidenceHoldPendingV17 => ({ publication: publication(pub), name: key.name, job: null, admittedAt: null });
const bound = (pub: number, admittedAt = pub + 10): EvidenceHoldPendingV17 => ({ ...unbound(pub), job: fact(admittedAt + 50), admittedAt });
const timeout = (slot: EvidenceHoldPendingV17): EvidenceFailureV17 => {
  if (slot.admittedAt === null || slot.job === null) throw Error("The scripted timeout has an admitted job");
  return failure(slot.publication.seq, slot.admittedAt, "timeout");
};

test("three pending identities are reserved before work, with no eviction or mutable rebind", () => {
  let pending: readonly EvidenceHoldPendingV17[] = [];
  for (const pub of [10, 20, 30]) pending = pendingOf(reserveEvidenceHoldPendingV17(pending, publication(pub), key.name));
  const before = canonicalize(pending);
  expect(reserveEvidenceHoldPendingV17(pending, publication(40), key.name)).toEqual({ ok: false, reason: "hold-pending-full" });
  expect(reserveEvidenceHoldPendingV17(pending, publication(10), key.name)).toEqual({ ok: true, pending });
  const job = bound(10);
  const linked = pendingOf(bindEvidenceHoldPendingV17(pending, job.publication, job.name, job.job!, job.admittedAt!, null));
  expect(bindEvidenceHoldPendingV17(linked, job.publication, job.name, job.job!, job.admittedAt!, null)).toEqual({ ok: true, pending: linked });
  for (const change of [
    bindEvidenceHoldPendingV17(linked, job.publication, job.name, fact(999), job.admittedAt!, null),
    bindEvidenceHoldPendingV17(linked, job.publication, job.name, job.job!, job.admittedAt! + 1, null),
    bindEvidenceHoldPendingV17(linked, { ...job.publication, hash: d("c") }, job.name, job.job!, job.admittedAt!, null),
  ]) expect(change).toEqual({ ok: false, reason: "hold-pending-conflict" });
  expect(canonicalize(pending)).toBe(before);
});

test("pending readers close malformed, sparse, duplicate and partially bound records", () => {
  for (const value of [
    [unbound(10), unbound(20), unbound(30), unbound(40)], [unbound(10), unbound(10)],
    [{ ...unbound(10), job: fact(60) }], [{ ...unbound(10), admittedAt: 20 }],
    [{ ...bound(10), admittedAt: 9 }], [{ ...unbound(10), extra: true }],
    [{ ...unbound(10), generation: key.generation }], new Array(1),
    [bound(10), { ...bound(20), job: bound(10).job }],
  ]) expect(readEvidenceHoldPendingV17(value)).toBeNull();
  const accessor = [unbound(10)];
  Object.defineProperty(accessor, "0", { enumerable: true, get: () => { throw Error("An index is not retained data"); } });
  expect(readEvidenceHoldPendingV17(accessor)).toBeNull();
});

test("covering a publication consumes its unbound placeholder only at binding; clearing and withdrawal have distinct authority", () => {
  const slot = bound(10);
  expect(bindEvidenceHoldPendingV17([unbound(10)], slot.publication, slot.name, slot.job!, slot.admittedAt!, 10)).toEqual({ ok: true, pending: [] });
  expect(bindEvidenceHoldPendingV17([], slot.publication, slot.name, slot.job!, slot.admittedAt!, null)).toEqual({ ok: false, reason: "hold-pending-conflict" });
  const pending = [unbound(5), bound(10), bound(30)];
  expect(clearEvidenceHoldPendingV17(pending, 10)).toEqual({ ok: true, pending: [unbound(5), bound(30)] });
  expect(withdrawEvidenceHoldPendingV17(pending, publication(5))).toEqual({ ok: true, pending: [bound(10), bound(30)] });
  expect(withdrawEvidenceHoldPendingV17(pending, publication(10))).toEqual({ ok: true, pending });
  expect(removeEvidenceHoldPendingV17(pending, bound(30).job!)).toEqual({ ok: true, pending: [unbound(5), bound(10)] });
});

test("running and unbound jobs do not hold; missing or mismatched bound state cannot masquerade as running", () => {
  const record = newEvidenceHoldV17(key)!, slot = bound(10), pending = [unbound(5), slot], seen: number[] = [];
  expect(effectiveEvidenceHoldV17(record, pending, entry => { seen.push(entry.publication.seq); return null; })).toEqual({ ok: true, active: false, cause: null, clearedThrough: null });
  expect(seen).toEqual([10]);
  expect(effectiveEvidenceHoldV17(record, pending, () => "unavailable")).toEqual({ ok: false, reason: "assessment-unavailable" });
  expect(effectiveEvidenceHoldV17(record, pending, () => { throw Error("A bounded source read failed"); })).toEqual({ ok: false, reason: "assessment-unavailable" });
  const cause = timeout(slot);
  for (const wrong of [
    { ...cause, job: fact(999) }, { ...cause, publication: publication(11), order: { ...cause.order, publication: 11 } },
    { ...cause, order: { ...cause.order, job: cause.order.job + 1 }, decidedAt: cause.decidedAt + 1 }, { ...cause, kind: "error" as const },
  ]) expect(effectiveEvidenceHoldV17(record, pending, () => wrong)).toEqual({ ok: false, reason: "assessment-unavailable" });
  expect(effectiveEvidenceHoldV17(record, [{ ...slot, name: "another-check" }], () => cause)).toEqual({ ok: false, reason: "evidence-invalid" });
});

test("assessment stops at the first sorted actual timeout and prefers an already recorded active cause without job reads", () => {
  const record = newEvidenceHoldV17(key)!, pending = [bound(30), bound(10), bound(20)], before = canonicalize(pending), seen: number[] = [];
  const answer = effectiveEvidenceHoldV17(record, pending, slot => {
    seen.push(slot.publication.seq);
    if (slot.publication.seq !== 10) throw Error("No second job read is needed");
    return timeout(slot);
  });
  expect(answer).toEqual({ ok: true, active: true, cause: timeout(bound(10)), clearedThrough: null });
  expect(seen).toEqual([10]);
  expect(canonicalize(pending)).toBe(before);
  const recorded = failed(record, failure(25));
  expect(effectiveEvidenceHoldV17(recorded, pending, () => { throw Error("Recorded cause is already sufficient"); }))
    .toEqual({ ok: true, active: true, cause: recorded.failure, clearedThrough: null });
});

test("a same-publication pass clears a TIME regardless of job order, while an earlier pass cannot clear a newer TIME", () => {
  const empty = newEvidenceHoldV17(key)!, slot = bound(20, 29), pass = passEvidenceHoldV17(empty, key, passed(20, 21), true);
  if (!pass.ok) throw Error("The scripted same-publication pass was refused");
  expect(effectiveEvidenceHoldV17(pass.record, [slot], () => { throw Error("Covered jobs are skipped before lookup"); }))
    .toEqual({ ok: true, active: false, cause: null, clearedThrough: 20 });
  const recorded = passEvidenceHoldV17(failed(empty, timeout(slot)), key, passed(20, 21), true);
  if (!recorded.ok) throw Error("The scripted recorded TIME pass was refused");
  expect(evidenceHoldActiveV17(recorded.record)).toBe(true); //old non-effective order API is preserved
  expect(effectiveEvidenceHoldV17(recorded.record, [], () => null)).toEqual({ ok: true, active: false, cause: null, clearedThrough: 20 });
  const newer = bound(21, 30);
  expect(effectiveEvidenceHoldV17(pass.record, [slot, newer], current => timeout(current)))
    .toEqual({ ok: true, active: true, cause: timeout(newer), clearedThrough: 20 });
});

test("reasoned override and transition cover the named publication prefix without becoming passes or releasing newer publications", () => {
  const empty = newEvidenceHoldV17(key)!, cause = timeout(bound(10, 20)), held = failed(empty, cause);
  const releases = [
    { kind: "override" as const, decidedAt: 40, through: cause.order, reason: "authorized recovery" },
    { kind: "transition" as const, decidedAt: 40, through: cause.order, reason: "adopt new generation", next: { ...key.generation, seq: 2 } },
  ];
  for (const release of releases) {
    const changed = releaseEvidenceHoldV17(held, release); if (!changed.ok) throw Error("The scripted release was refused");
    expect(changed.record.release).toEqual(release);
    const covered = bound(10, 30), newer = bound(11, 31), seen: number[] = [];
    const answer = effectiveEvidenceHoldV17(changed.record, [covered, newer], slot => { seen.push(slot.publication.seq); return timeout(slot); });
    expect(answer).toEqual({ ok: true, active: true, cause: timeout(newer), clearedThrough: 10 });
    expect(seen).toEqual([11]);
    expect(changed.record.key.generation).toEqual(key.generation);
  }
});

test("reading or announcing a timeout does not prune its pointer or replace its incident, even when a later pass covers it", () => {
  const slot = bound(10), pending = [slot], before = canonicalize(pending), cause = timeout(slot), empty = newEvidenceHoldV17(key)!;
  const decided = decideEvidenceIncidentV17(reserveEvidenceIncidentV17(cause.job)!, cause);
  if (!decided.ok) throw Error("The scripted timeout incident was refused");
  for (let n = 0; n < 2; n++) expect(effectiveEvidenceHoldV17(empty, pending, () => cause)).toMatchObject({ ok: true, active: true });
  const pass = passEvidenceHoldV17(empty, key, passed(10), true); if (!pass.ok) throw Error("The scripted late pass was refused");
  expect(effectiveEvidenceHoldV17(pass.record, pending, () => cause)).toMatchObject({ ok: true, active: false });
  expect(canonicalize(pending)).toBe(before);
  expect(decided.incident.cause).toEqual(cause);
  expect(clearEvidenceHoldPendingV17(pending, 10)).toEqual({ ok: true, pending: [] });
});
