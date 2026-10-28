import { expect, inject, test } from "vitest";
import { runDurableObjectAlarm } from "cloudflare:test";
import type { EvidenceBinding, Observation } from "@generalbusiness/dap-contract";
import { canonicalize, evidenceBindingDigest, factRefOf, isRecord, isSeed, readEvidenceBinding, scopeIdOf } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { EVIDENCE_RULES_COHORT } from "../../platform/src/evidence-cohort.ts";
import { claimEvidenceWork, configureEvidenceRules, enrolEvidenceKey, evidenceCertificate, evidenceChecker, evidenceNativeRoom,
  evidenceEntry, evidenceRecord, evidenceRulesObservation, evidenceRulesPolicy, prepareEvidenceWork, publishEvidenceRulesCertificate, requestEvidenceWork } from "./evidence-rules-real-fixture.ts";
import { claimPublishedEvidence, prepareAuditEvidence, preparePublishedEvidence, publishEvidenceFile, revisePublishedEvidence } from "./evidence-rules-real-fixture.ts";
import { runEvidenceContainerCase } from "./evidence-runner-case.ts";
import { hardeningItems, hardeningSealed } from "./certified-rules-hardening-fixture.ts";
import { readEvidenceJobRecordWireV17, readEvidenceServiceWireV17 } from "../../platform/src/destination-evidence-v17.ts";
import { evidenceHoldActiveV17 } from "../../platform/src/evidence-holds-v17.ts";
import { rita } from "./repository.ts";

// Register/Directory/Membership/Rules/Destination creation, authority, native
// observations, admitted source/job facts, delivery and SQLite are real.
// Git/provider replies, task-instance locator, clock and scheduling are TEST
// stands. Manual signed outcomes below are claims, not executed checker runs.
const observedRules = evidenceRulesObservation;

test("the real evidence cohort publishes a scoped mark, preserves unchanged generations and requires an admin beyond a customized publish action", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    for (const [node, pin] of [[room.R, EVIDENCE_RULES_COHORT.register], [room.D, EVIDENCE_RULES_COHORT.directory],
      [room.M, EVIDENCE_RULES_COHORT.membership], [room.Q, EVIDENCE_RULES_COHORT.rules], [room.G, EVIDENCE_RULES_COHORT.destination]] as const)
      expect((await node.summary()).value.definition).toBe(pin);
    expect((await observedRules(room)).content).toMatchObject({ roomService: null, serviceGeneration: { rules: await room.Q.at(), seq: 0 } });
    const service = await evidenceChecker(room), policy = evidenceRulesPolicy({ checker: service.member, key: service.actor.key });
    await configureEvidenceRules(room, policy);
    const first = await observedRules(room), firstPublish = (await room.Q.item(0)).refs['published'];
    expect(first.serviceGeneration).toEqual({ rules: await room.Q.at(), seq: firstPublish });
    expect((await room.Q.last()).effects).toContainEqual({ effect: "ref", item: 0, slot: "roomServiceChanged", to: firstPublish });
    await configureEvidenceRules(room, { ...policy, labels: ["same service"] });
    const unchanged = await observedRules(room);
    expect(unchanged.revision).toBeGreaterThan(first.revision);
    expect(unchanged.serviceGeneration).toEqual(first.serviceGeneration);
    expect(Object.hasOwn((await room.Q.item(0)).values, "roomService")).toBe(false);
    const key = await room.M.stub.observe({ of: await room.M.at(), key: service.actor.key }) as Observation;
    await room.M.did(rita, "set-actions", { on: 0, expected: await room.M.expected({ on: 0 }), fields: { role: "checker", actions: [...key.actions, "rules.publish"] } });
    const withdrawnPolicy = { ...policy, roomService: null }, certificate = await evidenceCertificate(room, withdrawnPolicy);
    expect(await publishEvidenceRulesCertificate(room, withdrawnPolicy, certificate.request, certificate.certificate, certificate.proof, certificate.proofBytes, service.actor))
      .toMatchObject({ answer: "refused", reason: "guard-failed", name: "room-service-admin-required" });
    expect((await observedRules(room)).serviceGeneration).toEqual(first.serviceGeneration);
    expect(await publishEvidenceRulesCertificate(room, withdrawnPolicy, certificate.request, certificate.certificate, certificate.proof, certificate.proofBytes))
      .toMatchObject({ answer: "accepted" });
    const withdrawn = await observedRules(room);
    expect(withdrawn.content.roomService).toBe(null);
    expect(withdrawn.serviceGeneration.seq).toBeGreaterThan(first.serviceGeneration.seq);
    await configureEvidenceRules(room, policy);
    const returned = await observedRules(room);
    expect(returned.content.roomService).toEqual(first.content.roomService);
    expect(returned.serviceGeneration.seq).toBeGreaterThan(withdrawn.serviceGeneration.seq);
    expect(returned.serviceGeneration).not.toEqual(first.serviceGeneration);
  } finally { room.life.release(); }
});

test("real admitted member work reuses its actual earlier pass, disables reuse on eligible disagreement and still admits a fresh job", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const work = await prepareEvidenceWork(room, { source: "member" });
    const result = await claimEvidenceWork(room, work, work, "passed");
    expect(await work.record()).toMatchObject({ state: "passed", result, signer: work.service.actor.key });
    const reused = await requestEvidenceWork(room, work, { reuse: true });
    expect(await reused.record()).toMatchObject({ state: "reused", countedJob: work.job, result });
    const fresh = await requestEvidenceWork(room, work);
    expect(await fresh.record()).toMatchObject({ state: "admitted" });
    const failed = await claimEvidenceWork(room, work, fresh, "failed");
    expect(await fresh.record()).toMatchObject({ state: "failed", result: failed });
    const refused = await requestEvidenceWork(room, work, { reuse: true });
    expect(await refused.record()).toMatchObject({ state: "refused", reason: "check-disagrees" });
    const explicit = await requestEvidenceWork(room, work);
    expect(await explicit.record()).toMatchObject({ state: "admitted" });
    await claimEvidenceWork(room, work, explicit, "passed");
    expect(await explicit.record()).toMatchObject({ state: "passed" });
    const stillDisabled = await requestEvidenceWork(room, work, { reuse: true });
    expect(await stillDisabled.record()).toMatchObject({ state: "refused", reason: "check-disagrees" });
    expect((await hardeningItems(work.lane, "result")).map(item => item.refs['job'])).toEqual([work.job.seq, fresh.job.seq, explicit.job.seq]);
    // The identical tree and configuration cannot reuse a member-source
    // claim after the policy selects the room service. It needs a fresh job.
    const roomPolicy = { ...work.policy, checks: work.policy.checks.map(check => ({ ...check, source: "room" as const })) };
    await configureEvidenceRules(room, roomPolicy);
    const observed = await observedRules(room);
    const roomBinding: EvidenceBinding = { ...work.binding, source: "room", policyGeneration: { rules: await room.Q.at(), seq: observed.revision } };
    const otherSource = await requestEvidenceWork(room, work, { reuse: true, binding: roomBinding });
    expect(await otherSource.record()).toMatchObject({ state: "admitted", countedJob: null, result: null });
    const roomResult = await claimEvidenceWork(room, work, otherSource, "passed");
    expect(await otherSource.record()).toMatchObject({ state: "passed", result: roomResult });
  } finally { room.life.release(); }
});

test("observed room-key rotation refuses both keys for the frozen real work job and only an explicit new admission can count", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const work = await prepareEvidenceWork(room);
    await enrolEvidenceKey(room, work.service, keys.vic);
    // Vic is a current checker key of the same member, but the room mark is
    // still Paul. The actual member-signed claim remains visible, uncounted.
    const memberClaim = await claimEvidenceWork(room, work, work, "passed", keys.vic);
    expect(await work.record()).toMatchObject({ state: "admitted", reason: "wrong-source", result: null });
    expect((await hardeningItems(work.lane, "result")).some(item => item.id === memberClaim.seq)).toBe(true);
    const rotatedPolicy = { ...work.policy, roomService: { checker: work.service.member, key: keys.vic.key } };
    await configureEvidenceRules(room, rotatedPolicy);
    const current = await observedRules(room);
    expect(current.serviceGeneration).not.toEqual(work.binding.serviceGeneration);
    const branch = (await hardeningItems(room.G, "branch"))[0];
    expect(readEvidenceServiceWireV17(branch?.values['evidenceService'])).toMatchObject({ generation: work.binding.serviceGeneration });
    const readsBefore = room.gitRequests.length;
    const readRequest = await work.lane.intent(work.service.actor, "git-read@1:job-read", { fields: { job: work.job } });
    expect(await work.scopes.stageSnapshot!(await work.lane.at(), readRequest)).toEqual({ refused: "wrong-source" });
    expect(room.gitRequests).toHaveLength(readsBefore);
    const old = await claimEvidenceWork(room, work, work, "passed");
    expect(await work.record()).toMatchObject({ state: "admitted", reason: "wrong-source", observedGeneration: current.serviceGeneration });
    await claimEvidenceWork(room, work, work, "passed", keys.vic);
    const frozen = await work.record();
    expect(frozen.reason).toBe("wrong-source");
    expect(frozen.state).toBe("admitted");
    expect(frozen.binding.serviceGeneration).toEqual(work.binding.serviceGeneration);
    expect((await hardeningItems(work.lane, "result")).some(item => item.id === old.seq)).toBe(true);
    const binding: EvidenceBinding = { ...work.binding, policyGeneration: { rules: await room.Q.at(), seq: current.revision },
      roomService: rotatedPolicy.roomService, serviceGeneration: current.serviceGeneration };
    const explicit = await requestEvidenceWork(room, work, { binding });
    expect(await explicit.record()).toMatchObject({ state: "admitted", binding });
    const result = await claimEvidenceWork(room, work, explicit, "passed", keys.vic);
    expect(await evidenceRecord(room, explicit.job)).toMatchObject({ state: "passed", signer: keys.vic.key, result });
  } finally { room.life.release(); }
});

test("real published holds survive newer counted passes and clear only through distinct authorized transition and override records", { timeout: 240_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await preparePublishedEvidence(room);
    const first = await publishEvidenceFile(room, setup, "First published check"), firstJob = await first.job();
    const second = await publishEvidenceFile(room, setup, "Second published check"), secondJob = await second.job();
    const third = await publishEvidenceFile(room, setup, "Third published check"), thirdJob = await third.job();
    const newGeneration = await revisePublishedEvidence(room, setup, { label: "TEST same configuration, new policy generation" });
    const fourth = await publishEvidenceFile(room, newGeneration, "New-generation published check"), fourthJob = await fourth.job();
    const newConfiguration = await revisePublishedEvidence(room, newGeneration, { label: "TEST changed configuration", image: `sha256:${"4".repeat(64)}` });
    const fifth = await publishEvidenceFile(room, newConfiguration, "Changed-configuration published check"), fifthJob = await fifth.job();
    expect(secondJob.binding.subject.kind).toBe("published");
    // All actual publications complete while their published jobs run.
    // No pending check retrospectively blocks an already admitted publication.
    expect(firstJob.record.state).toBe("admitted");
    expect(secondJob.record.state).toBe("admitted");
    expect(thirdJob.record.state).toBe("admitted");
    // Restore this descriptor before its late outcome; each result is
    // independently counted under a fresh current Rules observation.
    await configureEvidenceRules(room, newGeneration.policy);
    const failed = await claimPublishedEvidence(room, setup, second, secondJob, "failed");
    const holds = async () => (await hardeningItems(room.G, "evidence-job")).flatMap(item => readEvidenceJobRecordWireV17(item.values['record'])?.holds ?? []);
    const held = (await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold));
    if (!held) throw Error("Actual active native extent hold required");
    expect(held.failure).toMatchObject({ job: secondJob.job, result: failed, kind: "failed" });
    expect(fourthJob.binding.policyGeneration).not.toEqual(secondJob.binding.policyGeneration);
    expect(fourthJob.record.configuration).toBe(secondJob.record.configuration);
    await claimPublishedEvidence(room, newGeneration, fourth, fourthJob, "passed");
    expect(await evidenceRecord(room, fourthJob.job)).toMatchObject({ state: "passed" });
    await claimPublishedEvidence(room, setup, first, firstJob, "passed");
    expect(await evidenceRecord(room, firstJob.job)).toMatchObject({ state: "passed" });
    expect((await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))?.failure?.job).toEqual(secondJob.job);
    expect(fifthJob.record.configuration).not.toBe(secondJob.record.configuration);
    await configureEvidenceRules(room, newConfiguration.policy);
    await claimPublishedEvidence(room, newConfiguration, fifth, fifthJob, "passed");
    expect(await evidenceRecord(room, fifthJob.job)).toMatchObject({ state: "passed" });
    expect((await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))?.failure?.job).toEqual(secondJob.job);
    const blocked = await publishEvidenceFile(room, newConfiguration, "Blocked after recorded failure");
    const publication = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(blocked.operation));
    expect(publication).toMatchObject({ state: "not-reserved", values: { reason: "extent-regressed" } });
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(fifthJob.record.commit);
    const incidents = await hardeningItems(second.lane, "incident");
    expect(incidents).toHaveLength(1);
    const incident = incidents[0]!;
    const incidentEntry = await evidenceEntry(second.lane, incident.id);
    const create = incidentEntry?.sends.find(send => isSeed(send.to) && send.to.definition === setup.definitions.issue);
    if (!create || !isSeed(create.to)) throw Error("Actual nested incident creation send required");
    const child = room.life.platform(scopeIdOf(create.to)); room.nodes.push(child); await room.pause(room.nodes);
    expect((await child.summary()).value.definition).toBe(setup.definitions.issue);
    const childSource = await (child.stub as unknown as { source(seq: number, origin: boolean): Promise<{ under: string; origin?: readonly unknown[] } | null> }).source(0, true);
    expect(childSource?.under).toBe("issue");
    expect(childSource?.origin).toHaveLength(9);
    const intent = await child.item(0);
    expect(intent.values).toMatchObject({ kind: "published-failure", publishedCommit: secondJob.record.commit });
    expect(intent.parties['requester'] ?? null).toBe(null);
    expect(intent.parties['triagers']).toEqual([{ membership: await room.M.at(), member: "@rita" }]);
    expect(intent.refs['failedJob']).toEqual(secondJob.job);
    expect(intent.refs['failedResult']).toEqual(failed);
    const noticeEntry = (await hardeningSealed(room.G)).map(row => row.entry).find(entry => entry.sends.some(send => send.to && canonicalize(send.to) === canonicalize(secondJob.job.at)
      && send.message.class === "request" && send.message.type === "tell" && isRecord(send.message.body) && send.message.body['message'] === "published-check-failure"));
    const notice = noticeEntry?.sends.find(send => send.message.class === "request" && send.message.type === "tell" && isRecord(send.message.body) && send.message.body['message'] === "published-check-failure");
    if (!notice || !noticeEntry) throw Error("Actual native failure notice required");
    // Redeliver the exact sealed source send. No peer or fact is synthesized.
    await second.lane.stub.deliver({ from: factRefOf(noticeEntry), n: notice.n, to: await second.lane.at(), message: notice.message });
    await room.pause(room.nodes);
    expect(await hardeningItems(second.lane, "incident")).toHaveLength(1);
    expect(await child.act(rita, "close-own", { on: 0, expected: await child.expected({ on: 0 }) })).toMatchObject({ answer: "refused", reason: "guard-failed" });
    await child.did(rita, "close-any", { on: 0, expected: await child.expected({ on: 0 }) });
    expect((await holds()).some(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))).toBe(true);
    // No triager exists while the real timeout decides. Its incident cause
    // must remain that timeout even if an authentic late pass arrives first.
    const administrator = await room.M.stub.observe({ of: await room.M.at(), key: rita.key }) as Observation;
    await room.M.did(rita, "set-actions", { on: 0, expected: await room.M.expected({ on: 0 }), fields: {
      role: "admin", actions: administrator.actions.filter(action => action !== "issue.triage") } });
    room.life.advance(1_801_000); await runDurableObjectAlarm(room.G.object); await room.pause(room.nodes);
    const timed = await evidenceRecord(room, thirdJob.job);
    expect(timed).toMatchObject({ state: "timeout", result: null, noticeAt: null, incident: { cause: { kind: "timeout", result: null } } });
    expect(await hardeningItems(third.lane, "incident")).toHaveLength(0);
    const timedHold = (await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold));
    expect(timedHold?.failure).toMatchObject({ job: thirdJob.job, kind: "timeout", result: null });
    if (timed.holdOwner === null) throw Error("Actual hold owner required");
    await room.M.did(rita, "set-actions", { on: 0, expected: await room.M.expected({ on: 0 }), fields: { role: "admin", actions: administrator.actions } });
    await configureEvidenceRules(room, newGeneration.policy);
    const latePass = await claimPublishedEvidence(room, setup, third, thirdJob, "passed"), settled = await evidenceRecord(room, thirdJob.job);
    expect(settled).toMatchObject({ state: "passed", result: latePass, incident: { cause: timed.incident?.cause } });
    expect(settled.noticeAt).not.toBeNull();
    const delayed = (await hardeningItems(third.lane, "incident"))[0];
    if (!delayed) throw Error("Actual delayed timeout incident required");
    expect(JSON.parse(String(delayed.values['cause']))).toMatchObject({ kind: "timeout", result: null, decidedAt: timed.incident?.cause?.decidedAt });
    const delayedEntry = await evidenceEntry(third.lane, delayed.id), delayedCreate = delayedEntry.sends.find(send => isSeed(send.to) && send.to.definition === setup.definitions.issue);
    if (!delayedCreate || !isSeed(delayedCreate.to)) throw Error("Actual timeout incident creation required");
    const delayedChild = room.life.platform(scopeIdOf(delayedCreate.to)); room.nodes.push(delayedChild); await room.pause(room.nodes);
    const delayedSource = await (delayedChild.stub as unknown as { source(seq: number, origin: boolean): Promise<{ under: string; origin?: readonly unknown[] } | null> }).source(0, true);
    expect(delayedSource?.under).toBe("issue");
    expect(delayedSource?.origin).toHaveLength(9);
    expect((await delayedChild.item(0)).refs['failedResult'] ?? null).toBeNull();
    expect((await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))?.failure).toMatchObject({ job: thirdJob.job, kind: "timeout", result: null });
    const current = await observedRules(room), nextGeneration = { rules: await room.Q.at(), seq: current.revision };
    await room.G.did(rita, "evidence-hold-transition", { on: timed.holdOwner, expected: await room.G.expected({ on: timed.holdOwner }), fields: {
      extent: "readme", generation: canonicalize(nextGeneration), reason: "TEST authorized policy transition" } });
    const transitioned = (await holds()).find(hold => hold.key.extent === "readme" && canonicalize(hold.key.generation) === canonicalize(thirdJob.binding.policyGeneration));
    expect(transitioned?.release).toMatchObject({ kind: "transition", next: nextGeneration, reason: "TEST authorized policy transition" });
    expect(transitioned && evidenceHoldActiveV17(transitioned)).toBe(false);
    expect((await holds()).some(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))).toBe(true);
    await room.G.did(rita, "evidence-hold-override", { on: timed.holdOwner, expected: await room.G.expected({ on: timed.holdOwner }), fields: { extent: "other", reason: "TEST explicit triager override" } });
    const released = (await holds()).find(hold => hold.key.extent === "other");
    expect(released?.release).toMatchObject({ kind: "override", reason: "TEST explicit triager override" });
    expect(released && evidenceHoldActiveV17(released)).toBe(false);
  } finally { room.life.release(); }
});

test("a cancelled same-tree landing needs a fresh room audit and disagreeing results refuse its actual retry", { timeout: 180_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await prepareAuditEvidence(room), before = room.host.stand.refs.get("refs/heads/main");
    const change = await publishEvidenceFile(room, setup, "Audited actual reservation");
    const reserved = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(change.operation));
    expect(reserved).toMatchObject({ state: "reserved" });
    if (!reserved) throw Error("Actual reservation required");
    const opening = (await hardeningSealed(room.G)).find(row => row.entry.seq === reserved.id);
    if (!opening) throw Error("Actual sealed reservation opening required");
    const observed = await observedRules(room);
    const binding: EvidenceBinding = { v: 1, source: "member", stage: "landing", checker: setup.service.member,
      policyGeneration: { rules: await room.Q.at(), seq: observed.revision }, roomService: observed.content.roomService ?? null,
      serviceGeneration: observed.serviceGeneration, auditOf: null, subject: { kind: "landing", publication: factRefOf(opening.entry), manifest: change.manifest } };
    const laneRules = (await hardeningItems(change.lane, "rules"))[0]!;
    const request = async (proposed: EvidenceBinding, earlier?: number) => {
      const bindingDigest = evidenceBindingDigest(proposed);
      const jobSeq = await change.lane.did(rita, "request-check", { fields: { manifest: change.manifest.seq, name: "unit", configuration: setup.configurationDigest,
        checker: setup.service.member, binding: canonicalize(proposed), bindingDigest, ...(earlier === undefined ? {} : { earlier }) },
        expected: await change.lane.expected({ manifest: change.manifest.seq, proposal: 0, rules: laneRules.id, ...(earlier === undefined ? {} : { earlier }) }) });
      const memberJob = factRefOf(await evidenceEntry(change.lane, jobSeq));
      await room.pause(room.nodes);
      expect(await evidenceRecord(room, memberJob)).toMatchObject({ state: "admitted", binding: { source: "member" } });
      return { jobSeq, memberJob, bindingDigest };
    };
    const auditFor = async (memberJob: typeof change.manifest) => {
      const audit = (await hardeningItems(change.lane, "job")).find(item => {
        if (item.values['name'] !== "room-unit" || typeof item.values['binding'] !== "string") return false;
        const binding = readEvidenceBinding(JSON.parse(item.values['binding']));
        return binding !== null && canonicalize(binding.auditOf) === canonicalize(memberJob);
      });
      if (!audit || typeof audit.values['binding'] !== "string") throw Error("Actual fresh automatic audit job required");
      const job = factRefOf(await evidenceEntry(change.lane, audit.id));
      const binding = readEvidenceBinding(JSON.parse(audit.values['binding']));
      expect(binding).toMatchObject({ source: "room", auditOf: memberJob });
      return { audit, job, binding };
    };
    const first = await request(binding), oldAudit = await auditFor(first.memberJob);
    const oldResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: oldAudit.job.seq, jobFact: oldAudit.job,
      tree: reserved.values['tree'], configuration: setup.configurationDigest, bindingDigest: oldAudit.audit.values['bindingDigest'], outcome: "passed" },
      expected: await change.lane.expected({ job: oldAudit.job.seq, manifest: change.manifest.seq }) });
    const oldResult = factRefOf(await evidenceEntry(change.lane, oldResultSeq));
    await room.pause(room.nodes);
    expect(await evidenceRecord(room, oldAudit.job)).toMatchObject({ state: "passed", result: oldResult });
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(before);
    await change.lane.did(rita, "cancel-merge", { on: change.operation.seq, expected: await change.lane.expected({ on: change.operation.seq, proposal: 0 }) });
    await room.pause(room.nodes);
    expect((await hardeningItems(room.G, "publication")).find(item => item.id === reserved.id)?.state).not.toBe("reserved");
    const retrySeq = await change.lane.did(rita, "merge", { fields: { manifest: change.manifest.seq, reports: [] },
      expected: await change.lane.expected({ manifest: change.manifest.seq, proposal: 0, rules: laneRules.id }) });
    const retryOperation = factRefOf(await evidenceEntry(change.lane, retrySeq));
    await room.pause(room.nodes);
    const retry = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(retryOperation));
    expect(retry).toMatchObject({ state: "reserved", values: { tree: reserved.values['tree'] } });
    if (!retry) throw Error("Actual same-tree retry reservation required");
    const retryPublication = factRefOf(await evidenceEntry(room.G, retry.id));
    const retryBinding: EvidenceBinding = { ...binding, subject: { kind: "landing", publication: retryPublication, manifest: change.manifest } };
    const { jobSeq, memberJob, bindingDigest } = await request(retryBinding, first.jobSeq);
    const freshAudit = await auditFor(memberJob);
    expect(freshAudit.job).not.toEqual(oldAudit.job);
    expect(freshAudit.binding?.subject).toEqual(retryBinding.subject);
    expect(await evidenceRecord(room, freshAudit.job)).toMatchObject({ state: "admitted", countedJob: null, result: null, tree: reserved.values['tree'] });
    expect(await evidenceRecord(room, oldAudit.job)).toMatchObject({ state: "passed", result: oldResult });
    const memberResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: jobSeq, jobFact: memberJob,
      tree: retry.values['tree'], configuration: setup.configurationDigest, bindingDigest, outcome: "passed" }, expected: await change.lane.expected({ job: jobSeq, manifest: change.manifest.seq }) });
    const memberResult = factRefOf(await evidenceEntry(change.lane, memberResultSeq));
    await room.pause(room.nodes);
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(before);
    const audit = freshAudit.audit, auditJob = freshAudit.job;
    expect(auditJob).not.toEqual(memberJob);
    const auditResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: audit.id, jobFact: auditJob,
      tree: retry.values['tree'], configuration: setup.configurationDigest, bindingDigest: audit.values['bindingDigest'], outcome: "failed" }, expected: await change.lane.expected({ job: audit.id, manifest: change.manifest.seq }) });
    const auditResult = factRefOf(await evidenceEntry(change.lane, auditResultSeq));
    await room.pause(room.nodes);
    const refused = (await hardeningItems(room.G, "publication")).find(item => item.id === retry.id);
    expect(["cleanup-aborted", "cleanup-deleted", "cleaned"]).toContain(refused?.state);
    expect(refused?.values['reason']).toBe("audit-disagrees");
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(before);
    expect(await evidenceRecord(room, memberJob)).toMatchObject({ result: memberResult });
    expect(await evidenceRecord(room, auditJob)).toMatchObject({ result: auditResult });
  } finally { room.life.release(); }
});

// An explicit driver supplies this context and requires exactly this case.
// Ordinary gate has no VM requirement and records no physical-runner pass.
const runnerSettings = inject("evidenceRunner");
if (runnerSettings) test("marked room work uses the actual production Runner through Native admission", { timeout: 420_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const prepared = await prepareEvidenceWork(room, { image: runnerSettings.image, environment: runnerSettings.environment });
    await runEvidenceContainerCase(room, prepared, runnerSettings);
  } finally { room.life.release(); }
});
