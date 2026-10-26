import { expect, test } from "vitest";
import type { FactRef } from "@generalbusiness/dap-contract";
import { canonicalize, newIncarnation, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { observationOf, valueDigest } from "@generalbusiness/dap-derive";
import { d, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { MEMBERSHIP, standingOf } from "../src/membership.ts";
import { judgeReservation, judgeReservationWithStanding, type Statement } from "../src/reservation.ts";
import { judgeListEligibilityV14, judgeReservationV14, readRulesPolicyObservationV14, type ReservationAskedV14 } from "../src/reservation-v14.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV11 } from "../src/rules-policy-v11.ts";
import { certifiedPublicationState } from "../src/destination.ts";
import { CREATED, HEAD, NEXT, reading, rulesObserved, keyObserved, Roster, membershipPaul as paul, membershipRita as rita, membershipUna as una } from "./fixtures-entry.ts";

// Membership is judged in memory with its real rules below the made-up office of Roster. Its standing is the actual
// platform projection. Lane facts, manifest evidence and rules observations are hand-written; no host or lane is reached.
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
const statement: Statement = { operation: fact(1), manifest: fact(2), verdicts: [], jobs: [], reports: [], links: [] };

for (const loses of ["last active key", "membership"] as const) test(`a customized agent can merge while its controller is active; loss of the controller's ${loses} removes current merge authority while historical approval and check evidence still count`, () => {
  const m = new Roster().seated();
  const controller = m.did(rita, "invite-member", { fields: { handle: "@paul", role: "member", inviteHash: textDigest("controller invitation"), inviteEnds: t(600) } }).seq;
  const controllerKey = m.did(paul, "join", { fields: { invitation: controller, secret: "controller invitation" } }).seq;
  const agent = m.did(rita, "add-member", { fields: { handle: "@una", kind: "agent", controller: { membership: m.at, member: "@paul" } } }).seq;
  const invitation = m.did(rita, "invite-key", { fields: { member: agent, kind: "agent", inviteHash: textDigest("agent invitation"), inviteEnds: t(600) }, expected: { member: m.item(agent).revision } }).seq;
  m.did(una, "enrol", { on: 0, expected: { on: m.item(0).revision, member: m.item(agent).revision }, fields: { invitation, secret: "agent invitation" } });
  m.did(rita, "set-actions", { on: 0, expected: { on: m.item(0).revision }, fields: { role: "agent", actions: ["change.merge", "change.review", "change.check"] } });
  const observed = (key: typeof una.key) => observationOf(standingOf(m.state, { of: m.at, key }, MEMBERSHIP), m.now)!;
  const judge = (read = reading(m.now, { merger: observed(una.key) }), named = statement) => judgeReservation({ recorded: HEAD, evidence: CREATED, statement: named, read, time: m.now });
  const before = observed(una.key);
  expect(before).toMatchObject({ keyState: "active", memberState: "active", role: "agent", controller: "@paul", controllerActive: true, actions: ["change.merge", "change.review", "change.check"] });
  expect(judge()).toEqual({ reserved: true, integration: NEXT, reason: null });

  if (loses === "last active key") m.did(rita, "revoke-key", { on: controllerKey, expected: { on: m.item(controllerKey).revision, roster: m.item(0).revision, member: m.item(controller).revision }, fields: { as: "retired" } });
  else m.did(rita, "remove-member", { on: controller, expected: { on: m.item(controller).revision } });
  const after = observed(una.key);
  expect(after).toMatchObject({ keyState: "active", memberState: "active", controller: "@paul", controllerActive: false, actions: before.actions });
  expect(judge()).toEqual({ reserved: false, reason: "authority-lost" });

  // A currently authorized human merges. The agent's earlier approval remains valid while its key is not compromised;
  // a controller losing current authority does not turn that historical approval into a new act needing a current grant.
  const approve = { review: fact(3), reviewer: { membership: m.at, member: after.member }, verdict: "approve" as const };
  expect(judge(reading(m.now, { merger: observed(rita.key), rules: rulesObserved(m.now, { approvals: 1 }), verdicts: [{ sound: true, key: after }] }), { ...statement, verdicts: [approve] }))
    .toEqual({ reserved: true, integration: NEXT, reason: null });
  const job = { job: fact(4), name: "verify", state: "passed" as const, decidedBy: fact(5) };
  expect(judge(reading(m.now, { merger: observed(rita.key), rules: rulesObserved(m.now, { checks: [{ name: "verify", configuration: d("b"), required: true, checker: after.member }] }), checks: { verify: { opening: "sound", deciding: true, key: after } } }), { ...statement, jobs: [job] }))
    .toEqual({ reserved: true, integration: NEXT, reason: null });
});

test("D1 metadata and G14 required checks retain actual decision provenance while historical results stay exact", () => {
  // Lane facts and observations are stand-ins. This is the actual pure
  // reservation policy, with no runtime admission or key-freshness claim.
  const name: Statement = { ...statement, verdicts: [
    { review: fact(3), reviewer: una.member, verdict: "approve" },
    { review: fact(4), reviewer: rita.member, verdict: "approve" },
  ], jobs: [
    { job: fact(5), name: "verify", state: "passed", decidedBy: fact(6) },
    { job: fact(7), name: "optional", state: "passed", decidedBy: fact(8) },
  ] };
  const read = reading(t(0), {
    manifest: { base: HEAD, integration: NEXT, tree: CREATED.tree, reports: [], authors: [rita.member.member], complete: true },
    rules: rulesObserved(t(0), { approvals: 1, ownerMayReview: false, checks: [
      { name: "verify", configuration: d("b"), checker: una.member.member, required: true },
      { name: "optional", configuration: d("c"), checker: paul.member.member, required: false },
    ] }), verdicts: [{ sound: true, key: keyObserved(una, t(0)) }, { sound: true, key: keyObserved(rita, t(0)) }],
    checks: { verify: { opening: "sound", deciding: true, key: keyObserved(una, t(0)) }, optional: { opening: "sound", deciding: true, key: keyObserved(paul, t(0)) } },
  });
  const asked = { recorded: HEAD, evidence: CREATED, statement: name, read, time: t(0) };
  expect(judgeReservation(asked)).toEqual({ reserved: true, integration: NEXT, reason: null });
  expect(judgeReservationWithStanding(asked)).toEqual({ reserved: true, integration: NEXT, reason: null, standing: {
    base: [{ key: read.merger!.key, from: statement.operation }, { key: una.key, from: fact(3) }],
    checks: [{ name: "verify", job: fact(5), result: fact(6), key: una.key }],
  } });
  const missing = { ...name, jobs: name.jobs.map(job => ({ job: job.job, name: job.name, state: job.state })) };
  expect(judgeReservation({ ...asked, statement: missing })).toEqual({ reserved: true, integration: NEXT, reason: null });
  expect(judgeReservationWithStanding({ ...asked, statement: missing })).toEqual({ reserved: true, integration: NEXT, reason: null, standing: null });
  const extents = [{ name: "code", patterns: ["src/**"], approvals: 1, approver: "change.review", checks: ["verify"], class: "content" as const }];
  const byExtent = { ...asked, read: { ...read, extents }, statement: { ...name, verdicts: name.verdicts.map(verdict => ({ ...verdict, extent: "code" })) } };
  const decided = judgeReservationWithStanding(byExtent);
  expect(decided).toMatchObject({ reserved: true, standing: { base: [{ key: read.merger!.key }, { key: una.key }], checks: [{ name: "verify", key: una.key }] } });
  expect(judgeReservation(byExtent)).toEqual({ reserved: true, integration: NEXT, reason: null });

  // G14 pure consumer: every observation, lane proof and certificate below
  // is a labelled stand-in. No native policy publication or job is executed.
  // The actual strict decoder/judge must enforce a global check that no
  // touched extent names; the historical result above remains unchanged.
  const lintKey = keyObserved(una, t(0)), verifyKey = keyObserved(paul, t(0));
  const proposed = rulesPolicyProposalV11({ approvals: 0, allowZeroApprovals: true, ownerMayReview: false,
    checks: [
      { name: "lint", configuration: d("b"), required: false, checker: { membership: lintKey.of, member: lintKey.member } },
      { name: "verify", configuration: d("c"), required: true, checker: { membership: verifyKey.of, member: verifyKey.member } },
    ], labels: [], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 0, allowZeroApprovals: true, approver: "change.review", checks: ["lint"], class: "content" },
    ] });
  if (!proposed.ok) throw new Error("the strict fixture policy must be valid");
  const policy = proposed.policy;
  const destination = { ...statement.operation.at, kind: "destination" as const };
  const certificate = { request: { ...fact(10), at: destination }, certificate: { ...fact(11), at: destination }, proof: d("d"), commit: HEAD };
  const envelope = { configured: true, policy, proposal: proposed.digest, certificate };
  const observed = { ...rulesObserved(t(0)), definition: "platform:rules@11" as const, content: {
    asked: "rules" as const, approvals: policy.approvals, ownerMayReview: policy.ownerMayReview, labels: policy.labels,
    checks: policy.checks.map(check => ({ ...check, checker: check.checker.member })), singleControllerException: false,
    extents: valueDigest("artroom-rules-extents-2", envelope),
  } };
  const strictStatement: Statement = { ...statement, jobs: [
    { job: fact(12), name: "lint", state: "passed", decidedBy: fact(13) },
    { job: fact(14), name: "verify", state: "passed", decidedBy: fact(15) },
  ] };
  const strictRead = reading(t(0), { rules: observed, extents: policy.extents,
    checks: { lint: { opening: "sound", deciding: true, key: lintKey }, verify: { opening: "sound", deciding: true, key: verifyKey } } });
  const strict: ReservationAskedV14 = { recorded: HEAD, evidence: CREATED, statement: strictStatement, read: strictRead, time: t(0),
    policy: { rules: observed.of, destination, extents: envelope } };
  const lintOnly = { ...strict, statement: { ...strictStatement, jobs: strictStatement.jobs.slice(0, 1) } };
  expect(judgeReservation(lintOnly)).toEqual({ reserved: true, integration: NEXT, reason: null });
  expect(judgeReservationV14(lintOnly)).toEqual({ reserved: false, reason: "rules-not-met" });
  // The one authenticated value owns the full checker/policy projection;
  // there is no second digest/value lookup that a generic observer can miss.
  const decodedEnvelope = readRulesPolicyObservationV14(observed, strict.policy, t(0));
  expect(decodedEnvelope).toMatchObject({ ok: true, view: { proposal: proposed.digest, policy } });
  const oversized = { ...envelope, policy: { ...policy, labels: ["x".repeat(262144)] } };
  expect(utf8(canonicalize(oversized)).length).toBeGreaterThan(262144);
  const oversizedObserved = { ...observed, content: { ...observed.content, extents: valueDigest("artroom-rules-extents-2", oversized) } };
  expect(readRulesPolicyObservationV14(oversizedObserved, { ...strict.policy, extents: oversized }, t(0)))
    .toEqual({ ok: false, reason: "evidence-invalid" });
  // A configured envelope cannot borrow a policy from an unrelated input.
  const absentPolicy = { ...envelope, policy: null };
  expect(readRulesPolicyObservationV14({ ...observed, content: { ...observed.content,
    extents: valueDigest("artroom-rules-extents-2", absentPolicy) } }, { ...strict.policy, extents: absentPolicy }, t(0)))
    .toEqual({ ok: false, reason: "evidence-invalid" });

  expect(judgeReservationV14({ ...strict, read: { ...strictRead, checks: { ...strictRead.checks,
    verify: { ...strictRead.checks["verify"]!, opening: "other-configuration" } } } })).toEqual({ reserved: false, reason: "rules-not-met" });
  const invalidGlobal = { ...strict, statement: { ...strictStatement, jobs: strictStatement.jobs.slice(1) },
    read: { ...strictRead, checks: { ...strictRead.checks, verify: { ...strictRead.checks["verify"]!, deciding: false } } } };
  expect(judgeReservation(invalidGlobal)).toEqual({ reserved: false, reason: "rules-not-met:source" });
  expect(judgeReservationV14(invalidGlobal)).toEqual({ reserved: false, reason: "evidence-invalid" });
  expect(judgeReservationV14(strict)).toEqual({ reserved: true, integration: NEXT, reason: null, standing: {
    base: [{ key: strictRead.merger!.key, from: statement.operation }], checks: [
      { name: "lint", job: fact(12), result: fact(13), key: lintKey.key },
      { name: "verify", job: fact(14), result: fact(15), key: verifyKey.key },
    ],
  } });
  const otherIncarnation = { ...verifyKey, of: { ...verifyKey.of, inc: newIncarnation(new Uint8Array(16).fill(9)) } };
  expect(judgeReservationV14({ ...strict, read: { ...strictRead, checks: { ...strictRead.checks,
    verify: { ...strictRead.checks["verify"]!, key: otherIncarnation } } } })).toEqual({ reserved: false, reason: "evidence-invalid" });
  expect(judgeReservationV14({ ...strict, statement: { ...strictStatement, jobs: strictStatement.jobs.map(job =>
    job.name === "verify" ? { job: job.job, name: job.name, state: job.state } : job) } })).toEqual({ reserved: false, reason: "evidence-invalid" });

  // Eligibility may stage without future tree-bound jobs. It is not a final
  // reservation and still captures both full configured checker references.
  const beforeStage = { ...strict, statement: { ...strictStatement, jobs: [] }, read: { ...strictRead, checks: {} } };
  const eligible = judgeListEligibilityV14(beforeStage);
  expect(eligible).toMatchObject({ eligible: true, integration: NEXT, required: policy.checks });
  expect(eligible).not.toHaveProperty("reserved");
  expect(judgeReservationV14(beforeStage)).toEqual({ reserved: false, reason: "rules-not-met" });
  const unconfigured = { configured: false, policy: null, proposal: null, certificate: null };
  const missingPolicy = { ...strict, policy: { ...strict.policy, extents: unconfigured },
    read: { ...strictRead, rules: { ...observed, content: { ...observed.content, extents: valueDigest("artroom-rules-extents-2", unconfigured) } } } };
  expect(judgeReservationV14(missingPolicy)).toEqual({ reserved: false, reason: "rules-not-configured" });
  expect(judgeListEligibilityV14(missingPolicy)).toEqual({ eligible: false, reason: "rules-not-configured" });
  expect(judgeReservationV14({ ...missingPolicy, read: { ...missingPolicy.read, merger: null } })).toEqual({ reserved: false, reason: "authority-lost" });
  expect(judgeReservationV14({ ...missingPolicy, recorded: NEXT })).toEqual({ reserved: false, reason: "out-of-date" });
  // One owned, bounded record must keep the captured policy when a job
  // generation changes. These are shape fixtures, not accepted native jobs.
  if (!eligible.eligible) throw new Error("the strict fixture must be eligible before staging");
  const callerLabels = [...policy.labels];
  const captured = { observation: observed, input: { ...strict.policy, extents: { ...envelope, policy: { ...policy, labels: callerLabels } } },
    touched: ["source"], required: eligible.required, tree: CREATED.tree, manifest: statement.manifest };
  const current = { name: "verify", job: fact(14), passed: true, proof: { result: fact(15), key: verifyKey.key, decided: 16,
    configuration: d("c"), checker: { membership: verifyKey.of, member: verifyKey.member }, tree: CREATED.tree, proposal: proposed.digest } };
  const original = { policy: captured, generations: [current] };
  const stored = certifiedPublicationState(original);
  expect(stored).toEqual(original);
  if (!stored) throw new Error("the combined fixture record must be valid");
  const next = { name: "verify", job: fact(17), passed: false };
  const fenced = certifiedPublicationState({ policy: stored.policy, generations: [next] });
  expect(fenced).toEqual({ policy: stored.policy, generations: [next] });
  expect(stored.generations).toEqual([current]);
  expect(certifiedPublicationState({ ...original, generations: [current, next] })).toBeNull();
  expect(certifiedPublicationState({ ...original, generations: [next], certifiedPolicy: captured })).toBeNull();
  expect(certifiedPublicationState({ ...original, policy: { ...captured, required: [] } })).toBeNull();
  current.proof.configuration = d("e");
  expect(stored.generations[0]?.proof?.configuration).toBe(d("c"));
  // Mutating the caller's policy cannot rewrite an already decoded record.
  const storedPolicyText = canonicalize(stored.policy);
  callerLabels.push("later-label");
  expect(canonicalize(stored.policy)).toBe(storedPolicyText);

  // A lane-cached or contradictory outer checker configuration cannot stand
  // in for the complete proposal that the authenticated Q11 answer names.
  expect(judgeReservationV14({ ...strict, read: { ...strictRead, rules: { ...observed, content: { ...observed.content,
    checks: observed.content.checks.map(check => check.name === "verify" ? { ...check, configuration: d("e") } : check) } } } })).toEqual({ reserved: false, reason: "evidence-invalid" });

});
