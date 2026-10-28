import { expect, test } from "vitest";
import type { EvidenceBinding, FactRef, KeyId } from "@generalbusiness/dap-contract";
import { canonicalize, keyIdOf } from "@generalbusiness/dap-bytes";
import { d, keys, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { evidenceProgressCohortV17, type EvidenceJobRecordV17 } from "../src/destination-evidence-v17.ts";
import type { CertifiedGenerationV17 } from "../src/destination-budget-v17.ts";
import type { RulesCheckV13 } from "../src/rules-policy-v13.ts";

// SCRIPTED retained rows, aliases and source facts. The real pure selector
// is exercised, without Native admission, key standing, signatures, or an
// executed progress turn. Key bytes below identify distinct test subjects.
type Required = Pick<RulesCheckV13, "name" | "audit">;
const destination = { ...otherLane, kind: "destination" as const }, rules = { ...otherLane, kind: "rules" as const };
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
const key = (n: number): KeyId => keyIdOf(new Uint8Array(32).fill(n));
function row(name: string, seq: number, signer: KeyId | null, state: EvidenceJobRecordV17["state"] = "passed"): EvidenceJobRecordV17 {
  const binding: EvidenceBinding = { v: 1, source: "member", stage: "landing", checker: { ...keys.una.member, member: `@${name}` },
    policyGeneration: { rules, seq: 1 }, roomService: null, serviceGeneration: { rules, seq: 0 }, auditOf: null,
    subject: { kind: "landing", publication: { ...fact(1), at: destination }, manifest: fact(2) } };
  return { v: 1, job: fact(seq), name, configuration: d("b"), binding, bindingDigest: d("c"), state, admittedAt: seq + 1,
    commit: "a".repeat(40), tree: "b".repeat(40), base: "c".repeat(40), sourceFacts: [], commitProof: null, policy: null,
    reuseOwner: null, reuse: null, holdOwner: null, holds: [], covered: [], policyOwner: null, incident: null,
    result: signer ? fact(seq + 1000) : null, signer, decidedAt: seq + 2, reason: null, observedGeneration: { rules, seq: 0 },
    funded: { reuse: false, holds: false, policy: false, incident: false }, countedJob: null, reuseRequested: false,
    deadline: t(60), forJob: null, noticeAt: null, holder: 3, requestAt: 4 };
}
function auditRow(name: string, seq: number, signer: KeyId, logical: FactRef, counted: FactRef = logical): EvidenceJobRecordV17 {
  const record = row(name, seq, signer);
  return { ...record, binding: { ...record.binding, source: "room", auditOf: counted }, forJob: logical };
}
const generation = (record: EvidenceJobRecordV17): CertifiedGenerationV17 => ({ name: record.name, job: record.job, passed: true });
function select(required: readonly Required[], generations: readonly CertifiedGenerationV17[], current: EvidenceJobRecordV17,
  retained: readonly EvidenceJobRecordV17[], paired: readonly EvidenceJobRecordV17[] = [], aliases: readonly [FactRef, FactRef][] = []) {
  const byJob = new Map(retained.map(record => [canonicalize(record.job), record]));
  const byLogical = new Map(paired.map(record => [canonicalize(record.forJob), record]));
  const byAlias = new Map(aliases.map(([selected, logical]) => [canonicalize(selected), logical]));
  return evidenceProgressCohortV17(required, generations, current, job => byJob.get(canonicalize(job)) ?? null,
    selected => byAlias.get(canonicalize(selected.job)) ?? null, logical => byLogical.get(canonicalize(logical)) ?? null);
}
function exact(actual: { applies: boolean; keys: readonly KeyId[] }, expected: readonly KeyId[], applies = true): void {
  // A cohort is a set, with no ordering promise. Sorting preserves extra
  // duplicates, so this still checks every returned subject exactly.
  expect({ applies: actual.applies, keys: [...actual.keys].sort() }).toEqual({ applies, keys: [...expected].sort() });
}

test("32required checks replace the rotating descriptor's old signer, retaining exactly32 distinct subjects and immutable inputs", () => {
  const required = Array.from({ length: 32 }, (_, n) => ({ name: `check${n}` }));
  const retained = required.map((check, n) => row(check.name, 100 + n, key(n + 1))), generations = retained.map(generation);
  const current = row("check0", 200, key(33)), before = canonicalize({ required, retained, generations, current });
  const answer = select(required, generations, current, [...retained, current]);
  exact(answer, [key(33), ...retained.slice(1).map(record => record.signer!)]);
  expect(answer.keys).toHaveLength(32);
  expect(answer.keys).not.toContain(key(1));
  expect(canonicalize({ required, retained, generations, current })).toBe(before);
});

test("replacing a member removes its old audit pair while unaffected required generations keep their signers", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }, { name: "other" }];
  const old = row("member", 10, key(1)), other = row("other", 20, key(2)), current = row("member", 30, key(3));
  const oldAudit = auditRow("audit", 40, key(4), old.job), newAudit = auditRow("audit", 50, key(5), current.job);
  const answer = select(required, [generation(old), generation(other)], current, [old, other, current], [oldAudit, newAudit]);
  exact(answer, [key(3), key(5), key(2)]);
  expect(answer.keys).not.toContain(key(1));
  expect(answer.keys).not.toContain(key(4));
  // A configured pair and another retained descriptor may share a key.
  exact(select(required, [generation(old), generation(other)], current, [old, other, current],
    [oldAudit, { ...newAudit, signer: key(2) }]), [key(3), key(2)]);
});

test("a reused member reads its counted result signer but selects the audit by its new logical job", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }];
  const old = row("member", 10, key(1)), counted = row("member", 20, key(2));
  const current = { ...row("member", 30, key(2), "reused"), countedJob: counted.job };
  const oldPair = auditRow("audit", 40, key(4), counted.job), newPair = auditRow("audit", 50, key(5), current.job, counted.job);
  const seen: FactRef[] = [], byJob = new Map([old, counted, current].map(record => [canonicalize(record.job), record]));
  const answer = evidenceProgressCohortV17(required, [generation(old)], current, job => {
    seen.push(job); return byJob.get(canonicalize(job)) ?? null;
  }, () => null, job => canonicalize(job) === canonicalize(current.job) ? newPair : oldPair);
  exact(answer, [key(2), key(5)]);
  expect(seen).toContainEqual(counted.job);
  expect(answer.keys).not.toContain(key(4));
});

test("an audit for a retained reused projection uses its actual logical alias and preserves unaffected keys", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }, { name: "other" }];
  const counted = row("member", 10, key(1)), logical = { ...row("member", 20, key(1), "reused"), countedJob: counted.job };
  const other = row("other", 30, key(3)), current = auditRow("audit", 40, key(2), logical.job, counted.job);
  exact(select(required, [generation(counted), generation(other)], current, [counted, logical, other, current], [current],
    [[counted.job, logical.job]]), [key(1), key(2), key(3)]);
});

test("an audit target that is itself required replaces its own row before its parent is projected", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }, { name: "audit" }, { name: "other" }];
  const old = row("audit", 10, key(1)), other = row("other", 20, key(2)), parent = row("member", 30, key(4));
  const current = auditRow("audit", 40, key(3), parent.job);
  const answer = select(required, [generation(old), generation(other)], current, [old, other, parent, current], [current]);
  exact(answer, [key(3), key(2)]);
  expect(answer.keys).not.toContain(key(1));
});

test("obsolete and unprojected audits do not apply, including a failed obsolete audit", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }];
  const counted = row("member", 10, key(1)), logical = row("member", 20, key(1), "reused");
  const oldLogical = row("member", 30, key(1), "reused"), obsolete = auditRow("audit", 40, key(2), oldLogical.job, counted.job);
  const selectedPair = auditRow("audit", 50, key(3), logical.job, counted.job);
  for (const state of ["passed", "failed", "error"] as const) exact(select(required, [generation(counted)], { ...obsolete, state },
    [counted, logical, oldLogical, obsolete, selectedPair], [obsolete, selectedPair], [[counted.job, logical.job]]), [], false);
  exact(select(required, [], selectedPair, [counted, logical, selectedPair], [selectedPair]), [], false);
  exact(select(required, [generation(counted)], row("optional", 60, key(4)), [counted]), [], false);
});

test("actual failed/error deciding progress needs only its own signer, while timeout/unknown retain the prospective cohort", () => {
  const required: Required[] = [{ name: "member", audit: { check: "audit", every: 1 } }, { name: "other" }];
  const old = row("member", 10, key(1)), other = row("other", 20, key(2)), current = row("member", 30, key(3));
  const pair = auditRow("audit", 40, key(4), current.job), generations = [generation(old), generation(other)];
  for (const state of ["failed", "error"] as const) exact(select(required, generations, { ...current, state }, [old, other, current], [pair]), [key(3)]);
  for (const state of ["timeout", "unknown"] as const) exact(select(required, generations, { ...current, state }, [old, other, current], [pair]), [key(3), key(4), key(2)]);
  // A later source refusal changes neither the deciding key nor the
  // lifecycle state. The Native guard still needs that actual key's fresh
  // observation; this pure selector does not declare it eligible.
  exact(select(required, generations, { ...current, reason: "wrong-source", observedGeneration: null }, [old, other, current], [pair]), [key(3), key(4), key(2)]);
  for (const state of ["failed", "error"] as const) {
    const decidingAudit = { ...pair, state };
    exact(select(required, [generation(current), generation(other)], decidingAudit, [current, other, decidingAudit], [decidingAudit]), [key(4)]);
  }
});
