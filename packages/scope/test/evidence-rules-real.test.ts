import { expect, inject, test } from "vitest";
import { runDurableObjectAlarm } from "cloudflare:test";
import type { Observation } from "@generalbusiness/dap-contract";
import { canonicalize, factRefOf, isDigest, isRecord, isSeed, scopeIdOf, timeMs } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, readEvidenceBinding, type EvidenceBinding } from "@generalbusiness/dap-platform";
import { isObjectId } from "@generalbusiness/dap-git";
import { keys } from "@generalbusiness/dap-derive/testing";
import { EVIDENCE_RULES_COHORT } from "../../platform/src/evidence-cohort.ts";
import { claimEvidenceWork, configureEvidenceRules, enrolEvidenceKey, evidenceCertificate, evidenceChecker, evidenceNativeRoom,
  evidenceEntry, evidenceItems as hardeningItems, evidenceNativeDiagnostic, evidenceNativeState, evidenceRecord, evidenceRulesObservation, evidenceRulesPolicy, prepareEvidenceWork, publishEvidenceRulesCertificate, requestEvidenceWork } from "./evidence-rules-real-fixture.ts";
import { claimLandingEvidence, claimPublishedEvidence, evidenceFailureNotice, evidenceOutcomeRace, prepareAuditEvidence, prepareLandingEvidence,
  preparePublishedEvidence, publishEvidenceFile, requestLandingEvidence, revisePublishedEvidence, type LandingEvidenceJob } from "./evidence-rules-real-fixture.ts";
import { runEvidenceContainerCase } from "./evidence-runner-case.ts";
import { hardeningSealed } from "./certified-rules-hardening-fixture.ts";
import { readEvidenceJobRecordWireV17, readEvidenceServiceWireV17 } from "../../platform/src/destination-evidence-v17.ts";
import { evidenceHoldActiveV17 } from "../../platform/src/evidence-holds-v17.ts";
import { evidenceIncidentAdmissionPositionV17 } from "../../platform/src/evidence-incident-origin-v17.ts";
import { evidenceWireV17, readEvidenceWireV17 } from "../../platform/src/evidence-wire-v17.ts";
import { readEvidenceCountsV17 } from "../../platform/src/evidence-index-v17.ts";
import { readEvidenceBatchWireV17 } from "../../platform/src/evidence-batch-v17.ts";
import { rita } from "./repository.ts";

// Register/Directory/Membership/Rules/Destination creation, authority, native
// observations, admitted source/job facts, delivery and SQLite are real.
// Git/provider replies, hold token/staging provider, task-instance locator,
// clock and scheduling are TEST stands. Manual signed outcomes below are
// claims, not executed checker runs.
const observedRules = evidenceRulesObservation;

test("the real evidence cohort publishes a scoped mark, preserves unchanged generations and requires an admin beyond a customized publish action", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    for (const [node, pin] of [[room.R, EVIDENCE_RULES_COHORT.register], [room.D, EVIDENCE_RULES_COHORT.directory],
      [room.M, EVIDENCE_RULES_COHORT.membership], [room.Q, EVIDENCE_RULES_COHORT.rules], [room.G, EVIDENCE_RULES_COHORT.destination]] as const)
      expect((await node.summary()).value.definition).toBe(pin);
    const unconfigured = await observedRules(room);
    expect(unconfigured).toMatchObject({ roomService: null, serviceGeneration: { rules: await room.Q.at(), seq: 0 } });
    expect(Object.hasOwn(unconfigured.content, 'roomService')).toBe(true);
    expect(Object.hasOwn(unconfigured.content, 'serviceGeneration')).toBe(true);
    expect(unconfigured.content['roomService']).toBeNull();
    expect(unconfigured.content['serviceGeneration']).toEqual({ rules: await room.Q.at(), seq: 0 });
    expect((await evidenceNativeState(room)).ledger).toBeNull();
    const service = await evidenceChecker(room), policy = evidenceRulesPolicy({ checker: service.member, key: service.actor.key });
    const firstCertificate = await configureEvidenceRules(room, policy), firstLedger = (await evidenceNativeState(room)).ledger;
    if (!firstLedger) throw Error('The first actual certificate must initialize the ledger');
    expect(await hardeningItems(room.G, 'evidence-ledger')).toHaveLength(1);
    expect(firstLedger.id).toBe(firstCertificate.request.seq);
    expect(readEvidenceCountsV17(firstLedger.values['counts'])).toEqual({ keys: 0, holds: 0, policyGenerations: 0, incidents: 0 });
    const firstBranch = (await hardeningItems(room.G, 'branch'))[0];
    if (!firstBranch) throw Error('The actual Native branch must retain its ledger reference');
    expect(firstBranch.refs['evidenceLedger']).toBe(firstLedger.id);
    const firstCertificateEntry = await evidenceEntry(room.G, firstCertificate.request.seq);
    expect(firstCertificateEntry.input).toMatchObject({ type: 'act', signed: { intent: { kind: 'certify-rules-tree' } } });
    expect(firstCertificateEntry.effects).toContainEqual({ effect: 'open', item: firstLedger.id, type: 'evidence-ledger', state: 'ready' });
    expect(firstCertificateEntry.effects).toContainEqual({ effect: 'value', item: firstLedger.id, slot: 'counts', value: { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 } });
    expect(firstCertificateEntry.effects).toContainEqual({ effect: 'ref', item: firstBranch.id, slot: 'evidenceLedger', to: firstLedger.id });
    const first = await observedRules(room), firstPublish = (await room.Q.item(0)).refs['published'];
    expect(first.serviceGeneration).toEqual({ rules: await room.Q.at(), seq: firstPublish });
    expect((await room.Q.last()).effects).toContainEqual({ effect: "ref", item: 0, slot: "roomServiceChanged", to: firstPublish });
    const repeatedCertificate = await configureEvidenceRules(room, { ...policy, labels: ["same service"] }), repeatedLedger = (await evidenceNativeState(room)).ledger;
    expect(await hardeningItems(room.G, 'evidence-ledger')).toHaveLength(1);
    expect(repeatedLedger?.id).toBe(firstLedger.id); expect(repeatedLedger?.opened).toBe(firstLedger.opened);
    expect((await hardeningItems(room.G, 'branch'))[0]?.refs['evidenceLedger']).toBe(firstLedger.id);
    expect((await evidenceEntry(room.G, repeatedCertificate.request.seq)).effects.some(effect => effect.effect === 'open' && effect.type === 'evidence-ledger')).toBe(false);
    expect(readEvidenceCountsV17(repeatedLedger?.values['counts'])).toEqual({ keys: 0, holds: 0, policyGenerations: 0, incidents: 0 });
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
    expect(withdrawn.roomService).toBe(null);
    expect(withdrawn.serviceGeneration.seq).toBeGreaterThan(first.serviceGeneration.seq);
    await configureEvidenceRules(room, policy);
    const returned = await observedRules(room);
    expect(returned.roomService).toEqual(first.roomService);
    expect(returned.serviceGeneration.seq).toBeGreaterThan(withdrawn.serviceGeneration.seq);
    expect(returned.serviceGeneration).not.toEqual(first.serviceGeneration);
  } finally { room.life.release(); }
});

test("real admitted member work reuses its actual earlier pass, disables reuse on eligible disagreement and still admits a fresh job", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const work = await prepareEvidenceWork(room, { source: "member" });
    const result = await claimEvidenceWork(room, work, work, "passed");
    const counted = await work.record(), expected = { state: "passed", result, signer: work.service.actor.key };
    try { expect(counted).toMatchObject(expected); }
    catch { expect(counted, await evidenceNativeDiagnostic([work.lane, room.G])).toMatchObject(expected); }
    const reused = await requestEvidenceWork(room, work, { reuse: true });
    expect(await reused.record()).toMatchObject({ state: "reused", countedJob: work.job, result });
    // Omitted source defaults to member, so this harmless policy revision
    // must reuse the same member pass across the policy-generation change.
    const memberPolicy = { ...work.policy, checks: work.policy.checks.map(({ source: _source, ...check }) => check), labels: ["TEST unchanged member descriptor"] };
    expect(memberPolicy.checks.every(check => !Object.hasOwn(check, 'source'))).toBe(true);
    await configureEvidenceRules(room, memberPolicy);
    const harmless = await observedRules(room);
    expect(harmless.revision).toBeGreaterThan(work.binding.policyGeneration.seq);
    expect(harmless.serviceGeneration).toEqual(work.binding.serviceGeneration);
    const memberBinding: EvidenceBinding = { ...work.binding, policyGeneration: { rules: await room.Q.at(), seq: harmless.revision } };
    const acrossGeneration = await requestEvidenceWork(room, work, { reuse: true, binding: memberBinding });
    expect(await acrossGeneration.record()).toMatchObject({ state: "reused", countedJob: work.job, result });
    const fresh = await requestEvidenceWork(room, work, { binding: memberBinding });
    expect(await fresh.record()).toMatchObject({ state: "admitted" });
    const failed = await claimEvidenceWork(room, work, fresh, "failed");
    expect(await fresh.record()).toMatchObject({ state: "failed", result: failed });
    const refused = await requestEvidenceWork(room, work, { reuse: true, binding: memberBinding });
    expect(await refused.record()).toMatchObject({ state: "refused", reason: "check-disagrees" });
    const explicit = await requestEvidenceWork(room, work, { binding: memberBinding });
    expect(await explicit.record()).toMatchObject({ state: "admitted" });
    await claimEvidenceWork(room, work, explicit, "passed");
    expect(await explicit.record()).toMatchObject({ state: "passed" });
    const stillDisabled = await requestEvidenceWork(room, work, { reuse: true, binding: memberBinding });
    expect(await stillDisabled.record()).toMatchObject({ state: "refused", reason: "check-disagrees" });
    expect((await hardeningItems(work.lane, "result")).map(item => item.refs['job'])).toEqual([work.job.seq, fresh.job.seq, explicit.job.seq]);
    // The identical tree and configuration cannot reuse a member-source
    // claim after the policy selects the room service. It needs a fresh job.
    const roomPolicy = { ...memberPolicy, checks: memberPolicy.checks.map(check => ({ ...check, source: "room" as const })) };
    await configureEvidenceRules(room, roomPolicy);
    const observed = await observedRules(room);
    const roomBinding: EvidenceBinding = { ...work.binding, source: "room", policyGeneration: { rules: await room.Q.at(), seq: observed.revision } };
    const otherSource = await requestEvidenceWork(room, work, { reuse: true, binding: roomBinding });
    expect(await otherSource.record()).toMatchObject({ state: "admitted", countedJob: null, result: null });
    const roomResult = await claimEvidenceWork(room, work, otherSource, "passed");
    expect(await otherSource.record()).toMatchObject({ state: "passed", result: roomResult });
  } finally { room.life.release(); }
});

test("actual landing reuse follows the tree key and a fresh passed job still publishes after disagreement disables reuse", { timeout: 240_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await prepareLandingEvidence(room);
    const published = async (job: LandingEvidenceJob) => {
      const actual = await job.record();
      if (job.binding.subject.kind !== "landing") throw Error("Actual landing subject required");
      const subject = job.binding.subject;
      if (!isObjectId(actual.commit)) throw Error("Actual published landing commit required");
      const publication = (await hardeningItems(room.G, "publication")).find(item => item.id === subject.publication.seq);
      expect(publication?.values).toMatchObject({ tree: job.tree, integration: actual.commit });
      expect((await hardeningItems(room.G, "receipt")).some(item => item.state === "written" && item.values['commit'] === actual.commit
        && (item.refs['publication'] === subject.publication.seq || item.values['publication'] === subject.publication.seq))).toBe(true);
      expect(room.host.stand.refs.get("refs/heads/main")).toBe(actual.commit);
      return actual.commit;
    };
    const first = await publishEvidenceFile(room, setup, "TEST tree T"), firstJob = await requestLandingEvidence(room, setup, first, false);
    const firstResult = await claimLandingEvidence(room, setup, first, firstJob, "passed");
    expect(await firstJob.record()).toMatchObject({ state: "passed", result: firstResult });
    await published(firstJob);
    const equal = await publishEvidenceFile(room, setup, "TEST tree T"), equalJob = await requestLandingEvidence(room, setup, equal, true);
    expect(equalJob.tree).toBe(firstJob.tree);
    expect(await equalJob.record()).toMatchObject({ state: "reused", countedJob: firstJob.job, result: firstResult });
    expect(await hardeningItems(equal.lane, "result")).toHaveLength(0);
    await published(equalJob);
    const different = await publishEvidenceFile(room, setup, "TEST tree U"), differentJob = await requestLandingEvidence(room, setup, different, true);
    expect(differentJob.tree).not.toBe(firstJob.tree);
    expect(await differentJob.record()).toMatchObject({ state: "admitted", countedJob: null, result: null });
    await claimLandingEvidence(room, setup, different, differentJob, "passed");
    const beforeFailure = await published(differentJob);
    const conflict = await publishEvidenceFile(room, setup, "TEST tree T"), conflictJob = await requestLandingEvidence(room, setup, conflict, false);
    expect(conflictJob.tree).toBe(firstJob.tree);
    const failed = await claimLandingEvidence(room, setup, conflict, conflictJob, "failed");
    expect(await conflictJob.record()).toMatchObject({ state: "failed", result: failed });
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(beforeFailure);
    const retry = await publishEvidenceFile(room, setup, "TEST tree T"), refused = await requestLandingEvidence(room, setup, retry, true);
    expect(refused.tree).toBe(firstJob.tree);
    expect(await refused.record()).toMatchObject({ state: "refused", reason: "check-disagrees" });
    const fresh = await requestLandingEvidence(room, setup, retry, false);
    expect(await fresh.record()).toMatchObject({ state: "admitted", countedJob: null });
    const freshResult = await claimLandingEvidence(room, setup, retry, fresh, "passed");
    expect(await fresh.record()).toMatchObject({ state: "passed", result: freshResult });
    expect(await published(fresh)).not.toBe(beforeFailure);
    expect(await firstJob.record()).toMatchObject({ result: firstResult });
    expect(await conflictJob.record()).toMatchObject({ result: failed });
  } finally { room.life.release(); }
});

test("observed room-key rotation refuses both keys for the frozen real work job and only an explicit new admission can count", { timeout: 120_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const work = await prepareEvidenceWork(room);
    await enrolEvidenceKey(room, work.service, keys.vic);
    const oldKeyJob = await requestEvidenceWork(room, work), newKeyJob = await requestEvidenceWork(room, work);
    expect(await oldKeyJob.record()).toMatchObject({ state: 'admitted', result: null, binding: work.binding });
    expect(await newKeyJob.record()).toMatchObject({ state: 'admitted', result: null, binding: work.binding });
    const decidingClaim = async (result: typeof work.job, job: typeof work.job) => {
      const entry = await evidenceEntry(work.lane, result.seq);
      expect(entry.effects).toContainEqual({ effect: 'state', item: job.seq, state: 'passed' });
      expect(entry.effects).toContainEqual({ effect: 'ref', item: job.seq, slot: 'decidedBy', to: result.seq });
    };
    // Vic is a current checker key of the same member, but the room mark is
    // still Paul. The actual member-signed claim remains visible, uncounted.
    const memberClaim = await claimEvidenceWork(room, work, work, "passed", keys.vic);
    await decidingClaim(memberClaim, work.job);
    expect(await work.record()).toMatchObject({ state: "admitted", reason: "wrong-source", result: null });
    expect((await hardeningItems(work.lane, "result")).some(item => item.id === memberClaim.seq)).toBe(true);
    const rotatedPolicy = { ...work.policy, roomService: { checker: work.service.member, key: keys.vic.key } };
    await configureEvidenceRules(room, rotatedPolicy);
    const current = await observedRules(room);
    expect(current.serviceGeneration).not.toEqual(work.binding.serviceGeneration);
    const ledger = (await evidenceNativeState(room)).ledger;
    if (!ledger) throw Error('The actual branch-bound singleton ledger is required');
    expect(readEvidenceServiceWireV17(ledger.values['service'])).toMatchObject({ generation: work.binding.serviceGeneration });
    const readsBefore = room.gitRequests.length;
    const readRequest = await work.lane.intent(work.service.actor, "git-read@1:job-read", { fields: { job: oldKeyJob.job } });
    expect(await work.scopes.stageSnapshot!(await work.lane.at(), readRequest)).toEqual({ refused: "wrong-source" });
    expect(room.gitRequests).toHaveLength(readsBefore);
    expect(await work.lane.item(oldKeyJob.job.seq)).toMatchObject({ state: 'requested' });
    const old = await claimEvidenceWork(room, work, oldKeyJob, "passed");
    await decidingClaim(old, oldKeyJob.job);
    expect(await oldKeyJob.record()).toMatchObject({ state: "admitted", reason: "wrong-source", result: null,
      binding: { serviceGeneration: work.binding.serviceGeneration }, observedGeneration: current.serviceGeneration });
    expect(await work.lane.item(newKeyJob.job.seq)).toMatchObject({ state: 'requested' });
    const newer = await claimEvidenceWork(room, work, newKeyJob, "passed", keys.vic);
    await decidingClaim(newer, newKeyJob.job);
    const frozen = await newKeyJob.record();
    expect(frozen).toMatchObject({ state: 'admitted', reason: 'wrong-source', result: null,
      binding: { serviceGeneration: work.binding.serviceGeneration }, observedGeneration: current.serviceGeneration });
    const visible = await hardeningItems(work.lane, 'result');
    expect(visible.some(item => item.id === old.seq)).toBe(true);
    expect(visible.some(item => item.id === newer.seq)).toBe(true);
    const binding: EvidenceBinding = { ...work.binding, policyGeneration: { rules: await room.Q.at(), seq: current.revision },
      roomService: rotatedPolicy.roomService, serviceGeneration: current.serviceGeneration };
    const explicit = await requestEvidenceWork(room, work, { binding });
    expect(await explicit.record()).toMatchObject({ state: "admitted", binding });
    const result = await claimEvidenceWork(room, work, explicit, "passed", keys.vic);
    await decidingClaim(result, explicit.job);
    expect(await evidenceRecord(room, explicit.job)).toMatchObject({ state: "passed", signer: keys.vic.key, result });
  } finally { room.life.release(); }
});

test("real published holds survive newer counted passes and clear only through distinct authorized transition and override records", { timeout: 240_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await preparePublishedEvidence(room);
    const older = await publishEvidenceFile(room, setup, "Older published failure notice"), olderJob = await older.job();
    const first = await publishEvidenceFile(room, setup, "First published check"), firstJob = await first.job();
    const second = await publishEvidenceFile(room, setup, "Second published check"), secondJob = await second.job();
    const newGeneration = await revisePublishedEvidence(room, setup, { label: "TEST same configuration, new policy generation" });
    const fourth = await publishEvidenceFile(room, newGeneration, "New-generation published check"), fourthJob = await fourth.job();
    const newConfiguration = await revisePublishedEvidence(room, newGeneration, { label: "TEST changed configuration", image: `sha256:${"4".repeat(64)}` });
    const fifth = await publishEvidenceFile(room, newConfiguration, "Changed-configuration published check"), fifthJob = await fifth.job();
    expect(secondJob.binding.subject.kind).toBe("published");
    // These three jobs fill one exact key's pending list. Keep the earlier
    // pass uncounted until the newer failure has actually been recorded.
    expect(await evidenceRecord(room, firstJob.job)).toMatchObject({ state: "admitted", result: null });
    expect(secondJob.record.state).toBe("admitted");
    // Restore this descriptor before its late outcome; each result is
    // independently counted under a fresh current Rules observation.
    await configureEvidenceRules(room, newGeneration.policy);
    const olderScope = await older.lane.at();
    room.life.setHold(envelope => "scope" in envelope.to && envelope.to.scope === olderScope.scope
      && envelope.message.class === "request" && envelope.message.type === "tell" && isRecord(envelope.message.body)
      && envelope.message.body['message'] === "published-check-failure");
    await claimPublishedEvidence(room, setup, older, olderJob, "failed");
    const olderNotice = await evidenceFailureNotice(room, olderJob.job);
    expect(await hardeningItems(older.lane, "incident")).toHaveLength(0);
    const failed = await claimPublishedEvidence(room, setup, second, secondJob, "failed");
    const holds = async () => (await hardeningItems(room.G, "evidence-job")).flatMap(item => readEvidenceJobRecordWireV17(item.values['record'])?.holds ?? []);
    const held = (await holds()).find(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold));
    if (!held) throw Error("Actual active native extent hold required");
    expect(held.failure).toMatchObject({ job: secondJob.job, result: failed, kind: "failed" });
    const unchangedActiveHold = async () => {
      const actual = (await holds()).find(hold => canonicalize(hold.key) === canonicalize(held.key));
      expect(actual?.key).toEqual(held.key); expect(actual?.failure).toEqual(held.failure);
      if (!actual) throw Error("Actual exact hold key required");
      expect(evidenceHoldActiveV17(actual)).toBe(true);
    };
    expect(fourthJob.binding.policyGeneration).not.toEqual(secondJob.binding.policyGeneration);
    expect(fourthJob.record.configuration).toBe(secondJob.record.configuration);
    await claimPublishedEvidence(room, newGeneration, fourth, fourthJob, "passed");
    expect(await evidenceRecord(room, fourthJob.job)).toMatchObject({ state: "passed" });
    const firstResult = await claimPublishedEvidence(room, setup, first, firstJob, "passed"), countedFirst = await evidenceRecord(room, firstJob.job);
    expect(countedFirst).toMatchObject({ state: "passed", result: firstResult, signer: setup.service.actor.key });
    if (countedFirst.decidedAt === null || held.failure === null) throw Error('Actual ordered pass and failure decisions required');
    expect(countedFirst.decidedAt).toBeGreaterThan(held.failure.decidedAt);
    await unchangedActiveHold();
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
    await unchangedActiveHold();
    // First deliver the genuine older notice only after the newer failure.
    // Its exact source pair comes from the retained G17 send above.
    room.life.setHold(() => false);
    await older.lane.stub.deliver(olderNotice); await room.pause(room.nodes);
    expect(await hardeningItems(older.lane, "incident")).toHaveLength(1);
    await unchangedActiveHold();
    const ordinaryOpening = await room.D.stub.submit(await room.D.intent(rita, 'open-issue', { expected: await room.D.expected({ repository: 0 }),
      fields: { definition: setup.definitions.issue, title: 'Unrelated ordinary intent', conditions: [] } }), [], { values: [setup.definitions.issueBytes] });
    expect(ordinaryOpening, canonicalize(ordinaryOpening)).toMatchObject({ answer: 'accepted' });
    if (ordinaryOpening.answer !== 'accepted') throw Error('Actual unrelated ordinary Issue creation required');
    const ordinaryCreated = await room.D.created(ordinaryOpening.receipt.fact.seq), ordinary = room.life.platform(ordinaryCreated.name);
    room.nodes.push(ordinary); await room.pause(room.nodes);
    expect((await ordinary.summary()).value.definition).toBe(setup.definitions.issue);
    expect(await ordinary.item(0)).toMatchObject({ state: 'open', values: { kind: 'ordinary' },
      parties: { requester: { membership: await room.M.at(), member: '@rita' } } });
    const ordinaryClosed = await ordinary.act(rita, 'close-own', { on: 0, expected: await ordinary.expected({ on: 0 }) });
    expect(ordinaryClosed, canonicalize(ordinaryClosed)).toMatchObject({ answer: 'accepted' });
    if (ordinaryClosed.answer !== 'accepted') throw Error('Actual requester closure of the unrelated intent required');
    await room.pause(room.nodes);
    expect((await hardeningItems(ordinary, 'intent')).find(item => item.id === 0)).toMatchObject({ state: 'closed', refs: { closedBy: ordinaryClosed.receipt.fact.seq } });
    await unchangedActiveHold();
    expect(await child.act(rita, "close-own", { on: 0, expected: await child.expected({ on: 0 }) })).toMatchObject({ answer: "refused", reason: "guard-failed" });
    await child.did(rita, "close-any", { on: 0, expected: await child.expected({ on: 0 }) });
    await unchangedActiveHold();
    const failedRecord = await evidenceRecord(room, secondJob.job);
    if (failedRecord.holdOwner === null) throw Error("Actual hold owner required");
    const current = await observedRules(room), nextGeneration = { rules: await room.Q.at(), seq: current.revision };
    await room.G.did(rita, "evidence-hold-transition", { on: failedRecord.holdOwner, expected: await room.G.expected({ on: failedRecord.holdOwner }), fields: {
      extent: "readme", job: secondJob.job, generation: canonicalize(nextGeneration), reason: "TEST authorized policy transition" } });
    const transitioned = (await holds()).find(hold => hold.key.extent === "readme" && canonicalize(hold.key.generation) === canonicalize(secondJob.binding.policyGeneration));
    expect(transitioned?.release).toMatchObject({ kind: "transition", next: nextGeneration, reason: "TEST authorized policy transition" });
    expect(transitioned && evidenceHoldActiveV17(transitioned)).toBe(false);
    expect((await holds()).some(hold => hold.key.extent === "other" && evidenceHoldActiveV17(hold))).toBe(true);
    await room.G.did(rita, "evidence-hold-override", { on: failedRecord.holdOwner, expected: await room.G.expected({ on: failedRecord.holdOwner }), fields: {
      extent: "other", job: secondJob.job, reason: "TEST explicit triager override" } });
    const released = (await holds()).find(hold => hold.key.extent === "other");
    expect(released?.release).toMatchObject({ kind: "override", reason: "TEST explicit triager override" });
    expect(released && evidenceHoldActiveV17(released)).toBe(false);
    // Commission the timeout job only after the old held prefix was
    // explicitly released, under a new actual certified generation.
    await configureEvidenceRules(room, setup.policy);
    const third = await publishEvidenceFile(room, setup, "Third published check"), thirdJob = await third.job();
    const timedKey = (hold: Awaited<ReturnType<typeof holds>>[number]) => hold.key.extent === 'other'
      && canonicalize(hold.key.generation) === canonicalize(thirdJob.binding.policyGeneration);
    // No triager exists while the real timeout decides. Its incident cause
    // must remain that timeout even if an authentic late pass arrives first.
    const administrator = await room.M.stub.observe({ of: await room.M.at(), key: rita.key }) as Observation;
    await room.M.did(rita, "set-actions", { on: 0, expected: await room.M.expected({ on: 0 }), fields: {
      role: "admin", actions: administrator.actions.filter(action => action !== "issue.triage") } });
    room.life.advance(1_801_000); await runDurableObjectAlarm(room.G.object); await room.pause(room.nodes);
    const timedView = (await evidenceNativeState(room)).jobs.find(row => canonicalize(row.raw.job) === canonicalize(thirdJob.job));
    if (!timedView || timedView.raw.admittedAt === null) throw Error('Actual literal timed job required');
    expect(timedView.raw.state).toBe('admitted');
    expect(timedView.current.state).toBe('timeout');
    await room.G.did(rita, 'evidence-recover-timeout', { on: 0, fields: { admission: factRefOf(await evidenceEntry(room.G, timedView.raw.admittedAt)), operation: third.operation },
      expected: await room.G.expected({ on: 0 }) });
    await room.pause(room.nodes);
    const timed = await evidenceRecord(room, thirdJob.job);
    expect(timed).toMatchObject({ state: "timeout", result: null, noticeAt: null, incident: { cause: { kind: "timeout", result: null } } });
    expect(await hardeningItems(third.lane, "incident")).toHaveLength(0);
    const timedHold = (await holds()).find(hold => timedKey(hold) && evidenceHoldActiveV17(hold));
    expect(timedHold?.failure).toMatchObject({ job: thirdJob.job, kind: "timeout", result: null });
    const latePass = await claimPublishedEvidence(room, setup, third, thirdJob, "passed"), late = await evidenceRecord(room, thirdJob.job);
    expect(late).toMatchObject({ state: "passed", result: latePass, noticeAt: null, incident: { cause: timed.incident?.cause } });
    expect(await hardeningItems(third.lane, 'incident')).toHaveLength(0);
    await room.M.did(rita, "set-actions", { on: 0, expected: await room.M.expected({ on: 0 }), fields: { role: "admin", actions: administrator.actions } });
    // Reoffer the same held native answer at its maintained one-second
    // retry boundary; this advances the fixture clock, without sleeping.
    room.life.advance(1000); await runDurableObjectAlarm(room.G.object); await room.pause(room.nodes);
    const settled = await evidenceRecord(room, thirdJob.job);
    expect(settled).toMatchObject({ state: 'passed', result: latePass, incident: { cause: timed.incident?.cause } });
    expect(settled.noticeAt).not.toBeNull();
    const timeoutNotice = await evidenceFailureNotice(room, thirdJob.job), nativeNotice = await evidenceEntry(room.G, timeoutNotice.from.seq);
    expect(evidenceIncidentAdmissionPositionV17(nativeNotice)).toBe(settled.admittedAt);
    // Synthetic projection controls over a copied actual notice: these
    // are not Native authority or additional history facts.
    const projected = (state: 'timeout' | 'passed', decidedAt: number | null) => {
      const copy = structuredClone(nativeNotice), row = copy.effects.find(effect => effect.effect === 'value' && effect.slot === 'record' && effect.item === settled.admittedAt);
      if (!row || row.effect !== 'value') throw Error('Actual notice record effect required');
      const read = readEvidenceWireV17(row.value, 196608);
      if (!read.ok || !isRecord(read.value)) throw Error('Actual notice wire required');
      row.value = evidenceWireV17({ ...read.value, state, decidedAt, result: state === 'timeout' ? null : settled.result }, 196608);
      return evidenceIncidentAdmissionPositionV17(copy);
    };
    if (timed.decidedAt === null) throw Error('Actual immutable TIME position required');
    expect(projected('timeout', timed.decidedAt)).toBe(settled.admittedAt);
    expect(projected('timeout', null)).toBeNull();
    expect(projected('timeout', timed.decidedAt + 1)).toBeNull();
    expect(projected('passed', timed.decidedAt)).toBeNull();
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
    expect((await holds()).find(timedKey)?.failure).toMatchObject({ job: thirdJob.job, kind: "timeout", result: null });
    expect((await holds()).some(hold => evidenceHoldActiveV17(hold))).toBe(false);
  } finally { room.life.release(); }
});

test("literal native TIME holds at its own head, replays unchanged, and recovers one funded incident within the pending bound", { timeout: 240_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await preparePublishedEvidence(room);
    const a = await publishEvidenceFile(room, setup, 'TEST pending A'), aJob = await a.job();
    const b = await publishEvidenceFile(room, setup, 'TEST pending B'), bJob = await b.job();
    const c = await publishEvidenceFile(room, setup, 'TEST literal TIME target'), target = await c.job();
    const full = await evidenceNativeState(room), pending = full.capacities.flatMap(row => row.holds ?? []).filter(row => row.key.extent === 'other');
    expect(pending).toHaveLength(1); expect(pending[0]!.pending.map(row => row.job)).toEqual([aJob.job, bJob.job, target.job]);
    const fundedBefore = await hardeningItems(room.G, 'evidence-batch');
    const excess = await publishEvidenceFile(room, setup, 'TEST full pending key');
    const fundedAfter = await hardeningItems(room.G, 'evidence-batch'), excessAccounts = fundedAfter.filter(item => {
      const batch = readEvidenceBatchWireV17(item.values['batch']);
      if (!batch) throw Error('Actual funded account wire required');
      return canonicalize(batch.operation) === canonicalize(excess.operation);
    });
    expect(excessAccounts).toHaveLength(0);
    expect(fundedAfter).toEqual(fundedBefore);
    const refusedFunding = (await hardeningSealed(room.G)).map(row => row.entry).filter(entry => entry.input.type === 'delivery'
      && entry.input.message.class === 'request' && entry.input.message.type === 'tell' && isRecord(entry.input.message.body)
      && entry.input.message.body['message'] === 'evidence-fund' && isRecord(entry.input.message.body['fields'])
      && canonicalize(entry.input.message.body['fields']['operation']) === canonicalize(excess.operation));
    expect(refusedFunding).toHaveLength(1);
    expect(refusedFunding[0]!.input).toMatchObject({ decision: 'refused', reason: { code: 'guard-failed', name: 'evidence-funding-unavailable' } });
    expect(refusedFunding[0]!.effects.some(effect => effect.effect === 'open' && ['evidence-batch', 'evidence-job'].includes(effect.type))).toBe(false);
    expect(await hardeningItems(excess.lane, 'job')).toHaveLength(0);
    const afterRefusal = await evidenceNativeState(room);
    expect(afterRefusal.jobs.map(row => row.raw.job)).toEqual(full.jobs.map(row => row.raw.job));
    expect(afterRefusal.capacities.flatMap(row => row.holds ?? []).find(row => row.key.extent === 'other')?.pending).toEqual(pending[0]!.pending);
    await claimPublishedEvidence(room, setup, a, aJob, 'passed'); await claimPublishedEvidence(room, setup, b, bJob, 'passed');
    expect((await evidenceNativeState(room)).capacities.flatMap(row => row.holds ?? []).find(row => row.key.extent === 'other')?.pending.map(row => row.job)).toEqual([target.job]);
    room.life.advance(1000);
    const before = await publishEvidenceFile(room, setup, 'TEST admitted before TIME'), beforeJob = await before.job();
    expect(beforeJob.record.state).toBe('admitted');
    const admission = target.record.admittedAt;
    if (admission === null) throw Error('Actual target admission required');
    const admissionFact = factRefOf(await evidenceEntry(room.G, admission));
    expect(await room.G.act(rita, 'evidence-recover-timeout', { on: 0, fields: { admission: admissionFact, operation: c.operation },
      expected: await room.G.expected({ on: 0 }) })).toMatchObject({ answer: 'refused', reason: 'guard-failed', name: 'not-a-timed-incident' });
    const due = timeMs(target.record.deadline);
    if (due === null || due <= room.life.now()) throw Error('Actual future native deadline required');
    const priorItem = (await evidenceNativeState(room)).jobs.find(row => row.item.id === admission)?.item;
    if (!priorItem) throw Error('Actual running target item required');
    room.life.advance(due - room.life.now()); await runDurableObjectAlarm(room.G.object); await room.pause(room.nodes);
    const timed = await evidenceNativeState(room, true), targetRow = timed.jobs.find(row => row.item.id === admission);
    if (!targetRow) throw Error('Actual timed target item required');
    expect(targetRow.item.state).toBe(`${priorItem.state}-timedout`);
    expect(targetRow.item.values['record']).toBe(priorItem.values['record']);
    expect(targetRow.raw).toMatchObject({ state: 'admitted', decidedAt: null, incident: { cause: null } });
    expect(targetRow.current).toMatchObject({ state: 'timeout', reason: 'check-timeout' });
    const timeoutPosition = targetRow.item.refs['timeoutDecision'];
    if (typeof timeoutPosition !== 'number') throw Error('Actual local TIME self reference required');
    const literal = await evidenceEntry(room.G, timeoutPosition);
    const timedRule = priorItem.state === 'hold-anchor' ? 'evidence-hold-deadline' : priorItem.state === 'reuse-anchor' ? 'evidence-reuse-deadline' : 'evidence-job-deadline';
    expect(literal.input).toMatchObject({ type: 'timed', item: admission, rule: timedRule, due: target.record.deadline });
    expect(targetRow.item.values['timeoutReason']).toBe('check-timeout');
    expect(literal.effects).toContainEqual({ effect: 'ref', item: admission, slot: 'timeoutDecision', to: timeoutPosition });
    expect(literal.sends).toHaveLength(0);
    expect(literal.effects.every(effect => ['state', 'value', 'ref'].includes(effect.effect) && 'item' in effect && effect.item === admission)).toBe(true);
    expect(targetRow.item.values['noticeOpenedAt']).toBeNull();
    const held = timed.holds.find(row => row.hold.key.extent === 'other');
    expect(held?.effective).toMatchObject({ ok: true, active: true, cause: { job: target.job, decidedAt: timeoutPosition, kind: 'timeout', reason: 'check-timeout', result: null } });
    expect(timed.jobs.find(row => canonicalize(row.raw.job) === canonicalize(beforeJob.job))?.current.state).toBe('admitted');
    expect(timed.capacities.flatMap(row => row.holds ?? []).find(row => row.key.extent === 'other')?.pending).toHaveLength(2);
    const after = await publishEvidenceFile(room, setup, 'TEST refused after TIME');
    expect((await hardeningItems(room.G, 'publication')).find(item => canonicalize(item.refs['operation']) === canonicalize(after.operation)))
      .toMatchObject({ state: 'not-reserved', values: { reason: 'extent-regressed' } });
    expect(room.host.stand.refs.get('refs/heads/main')).toBe(beforeJob.record.commit);
    const hydrated = await evidenceRecord(room, target.job);
    expect(hydrated.incident?.cause).toMatchObject({ job: target.job, decidedAt: timeoutPosition, kind: 'timeout', result: null });
    const opened = (await evidenceNativeState(room)).jobs.find(row => row.item.id === admission)?.item.values['noticeOpenedAt'];
    expect(typeof opened).toBe('number');
    const noticeOperations = async () => (await hardeningSealed(room.G)).flatMap(({ entry }) => entry.effects)
      .filter(effect => effect.effect === 'operation' && effect.kind === 'evidence-notice' && effect.for === hydrated.holder);
    expect(await noticeOperations()).toHaveLength(1);
    expect(await room.G.act(setup.service.actor, 'evidence-recover-timeout', { on: 0, fields: { admission: admissionFact },
      expected: await room.G.expected({ on: 0 }) })).toMatchObject({ answer: 'refused', reason: 'guard-failed', name: 'evidence-recovery-authority' });
    const checker = await room.M.stub.observe({ of: await room.M.at(), key: setup.service.actor.key }) as Observation;
    await room.M.did(rita, 'set-actions', { on: 0, fields: { role: 'checker', actions: [...checker.actions, 'issue.triage'] }, expected: await room.M.expected({ on: 0 }) });
    const triagerRecovery = await room.G.did(setup.service.actor, 'evidence-recover-timeout', { on: 0, fields: { admission: admissionFact }, expected: await room.G.expected({ on: 0 }) });
    const triagerEntry = await evidenceEntry(room.G, triagerRecovery);
    if (triagerEntry.input.type !== 'act') throw Error('Actual authorized triager act required');
    expect(triagerEntry.input.authority[0]?.actions).toContain('issue.triage');
    const administrator = await room.M.stub.observe({ of: await room.M.at(), key: rita.key }) as Observation;
    await room.M.did(rita, 'set-actions', { on: 0, fields: { role: 'admin', actions: administrator.actions.filter(action => action !== 'issue.triage') }, expected: await room.M.expected({ on: 0 }) });
    const performerRecovery = await room.G.did(rita, 'evidence-recover-timeout', { on: 0, fields: { admission: admissionFact, operation: c.operation }, expected: await room.G.expected({ on: 0 }) });
    const performerEntry = await evidenceEntry(room.G, performerRecovery);
    if (performerEntry.input.type !== 'act') throw Error('Actual original performer act required');
    expect(performerEntry.input.authority[0]?.actions).not.toContain('issue.triage');
    expect((await evidenceNativeState(room)).jobs.find(row => row.item.id === admission)?.item.values['noticeOpenedAt']).toBe(opened);
    expect(await noticeOperations()).toHaveLength(1);
    expect((await evidenceRecord(room, target.job)).incident?.cause).toEqual(hydrated.incident?.cause);
    const liveAdmission = beforeJob.record.admittedAt;
    if (liveAdmission === null) throw Error('Actual still-running job admission required');
    expect(await room.G.act(setup.service.actor, 'evidence-recover-timeout', { on: 0, fields: { admission: factRefOf(await evidenceEntry(room.G, liveAdmission)) },
      expected: await room.G.expected({ on: 0 }) })).toMatchObject({ answer: 'refused', reason: 'guard-failed', name: 'not-a-timed-incident' });
    const stillRunning = (await evidenceNativeState(room)).jobs.find(row => row.item.id === liveAdmission);
    if (!stillRunning) throw Error('The actual unaffected running job must remain present');
    expect(stillRunning.item.values['noticeOpenedAt']).toBeNull();
    expect(await noticeOperations()).toHaveLength(1);
  } finally { try { await room.pause(room.nodes); } finally { room.life.release(); } }
});

test("the real failure and reservation outcomes serialize atomically in both admitted-before-failure and failure-before-admission schedules", { timeout: 240_000 }, async () => {
  for (const heldKind of ["judge", "evidence-result"] as const) {
    const room = await evidenceNativeRoom();
    let race: ReturnType<typeof evidenceOutcomeRace> | null = null, driver: Promise<number> | null = null;
    try {
      const setup = await preparePublishedEvidence(room), earlier = await publishEvidenceFile(room, setup, "TEST earlier pending pass"), earlierJob = await earlier.job();
      const initial = await publishEvidenceFile(room, setup, "TEST race initial"), initialJob = await initial.job();
      race = evidenceOutcomeRace(room, heldKind);
      const next = await publishEvidenceFile(room, setup, "TEST racing publication");
      const failed = await claimPublishedEvidence(room, setup, initial, initialJob, "failed");
      const failureHold = async () => (await hardeningItems(room.G, "evidence-job")).flatMap(item => readEvidenceJobRecordWireV17(item.values['record'])?.holds ?? [])
        .some(hold => hold.key.extent === "other" && hold.failure !== null && canonicalize(hold.failure.job) === canonicalize(initialJob.job)
          && canonicalize(hold.failure.result) === canonicalize(failed) && evidenceHoldActiveV17(hold));
      race.enable(); driver = race.run();
      await race.entered; await race.assertSent();
      const other = await race.other;
      if (!other || other.entry.input.type !== "outcome") throw Error("Actual other native outcome seal required");
      const current = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(next.operation));
      if (heldKind === "judge") {
        expect(await evidenceRecord(room, initialJob.job)).toMatchObject({ state: "failed", result: failed });
        expect(await failureHold()).toBe(true);
      } else {
        expect(current?.state).toBe("reserved");
        expect(await evidenceRecord(room, initialJob.job)).toMatchObject({ state: "admitted", result: null });
        expect(await failureHold()).toBe(false);
      }
      race.release(); await driver; driver = null;
      await room.pause(room.nodes);
      const history = (await hardeningSealed(room.G)).map(row => row.entry), judgeOperation = race.operation("judge"), failureOperation = race.operation("evidence-result");
      const judges = history.filter(entry => entry.input.type === "outcome" && entry.input.operation === judgeOperation && entry.input.result === "confirmed");
      const failures = history.filter(entry => entry.input.type === "outcome" && entry.input.operation === failureOperation && entry.input.result === "confirmed");
      expect(judges).toHaveLength(1); expect(failures).toHaveLength(1);
      expect(await evidenceRecord(room, initialJob.job)).toMatchObject({ state: "failed", result: failed });
      expect(await failureHold()).toBe(true);
      const publication = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(next.operation));
      if (heldKind === "judge") {
        expect(failures[0]!.seq).toBeLessThan(judges[0]!.seq);
        expect(publication).toMatchObject({ state: "not-reserved", values: { reason: "extent-regressed" } });
        expect(room.host.stand.refs.get("refs/heads/main")).toBe(initialJob.record.commit);
      } else {
        expect(judges[0]!.seq).toBeLessThan(failures[0]!.seq);
        if (!publication || !isObjectId(publication.values['integration'])) throw Error("Actual admitted integration commit required");
        expect(room.host.stand.refs.get("refs/heads/main")).toBe(publication.values['integration']);
        expect((await hardeningItems(room.G, "receipt")).some(item => item.state === "written" && item.values['commit'] === publication.values['integration'])).toBe(true);
      }
      race.close();
      // The earlier publication's first pass really counts after the
      // newer failure, under the same still-current policy generation.
      // Its eligible clearing prefix must not reach the later failure.
      const failureRecord = await evidenceRecord(room, initialJob.job), priorHolds = await evidenceNativeState(room);
      const laterHold = priorHolds.holds.find(row => row.hold.key.extent === 'other' && row.hold.failure !== null
        && canonicalize(row.hold.failure.job) === canonicalize(initialJob.job));
      if (!laterHold || failureRecord.decidedAt === null || earlierJob.binding.subject.kind !== 'published') throw Error('Actual ordered published failure and earlier job required');
      const earlierPublication = earlierJob.binding.subject.publication, currentRules = await observedRules(room);
      expect(earlierJob.binding.policyGeneration).toEqual(initialJob.binding.policyGeneration);
      expect(earlierJob.binding.policyGeneration).toEqual({ rules: await room.Q.at(), seq: currentRules.revision });
      expect(await evidenceRecord(room, earlierJob.job)).toMatchObject({ state: 'admitted', result: null });
      const earlierResult = await claimPublishedEvidence(room, setup, earlier, earlierJob, 'passed'), counted = await evidenceRecord(room, earlierJob.job);
      expect(counted).toMatchObject({ state: 'passed', result: earlierResult, signer: setup.service.actor.key });
      if (counted.decidedAt === null) throw Error('Actual later counted pass decision required');
      expect(counted.decidedAt).toBeGreaterThan(failureRecord.decidedAt);
      const afterHold = (await evidenceNativeState(room)).holds.find(row => canonicalize(row.hold.key) === canonicalize(laterHold.hold.key));
      if (!afterHold) throw Error('The exact later hold must remain recorded');
      expect(afterHold.hold.key).toEqual(laterHold.hold.key); expect(afterHold.hold.failure).toEqual(laterHold.hold.failure);
      expect(afterHold.hold.release).toMatchObject({ kind: 'pass', job: earlierJob.job, result: earlierResult, publication: earlierPublication });
      expect(evidenceHoldActiveV17(afterHold.hold)).toBe(true);
      expect(afterHold.effective).toMatchObject({ ok: true, active: true, cause: { job: initialJob.job, result: failed } });
      const following = await publishEvidenceFile(room, setup, "TEST following held extent");
      expect((await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(following.operation)))
        .toMatchObject({ state: "not-reserved", values: { reason: "extent-regressed" } });
    } finally {
      race?.release();
      try { if (driver) await driver; await room.pause(room.nodes); }
      finally { race?.close(); room.life.release(); }
    }
  }
});

test("a cancelled same-tree landing needs a fresh room audit and disagreeing results refuse its actual retry", { timeout: 180_000 }, async () => {
  const room = await evidenceNativeRoom();
  try {
    const setup = await prepareAuditEvidence(room), before = room.host.stand.refs.get("refs/heads/main");
    const change = await publishEvidenceFile(room, setup, "Audited actual reservation");
    const reserved = (await hardeningItems(room.G, "publication")).find(item => canonicalize(item.refs['operation']) === canonicalize(change.operation));
    expect(reserved).toMatchObject({ state: "reserved" });
    if (!reserved) throw Error("Actual reservation required");
    const reservedTree = reserved.values['tree'];
    if (!isObjectId(reservedTree)) throw Error("Actual reservation tree required");
    const opening = (await hardeningSealed(room.G)).find(row => row.entry.seq === reserved.id);
    if (!opening) throw Error("Actual sealed reservation opening required");
    const observed = await observedRules(room);
    const binding: EvidenceBinding = { v: 1, source: "member", stage: "landing", checker: setup.service.member,
      policyGeneration: { rules: await room.Q.at(), seq: observed.revision }, roomService: observed.roomService,
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
      const bindingDigest = audit.values['bindingDigest'];
      if (!isDigest(bindingDigest)) throw Error("Actual automatic audit binding digest required");
      return { audit, job, binding, bindingDigest };
    };
    const first = await request(binding), oldAudit = await auditFor(first.memberJob);
    const oldResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: oldAudit.job.seq, jobFact: oldAudit.job,
      tree: reservedTree, configuration: setup.configurationDigest, bindingDigest: oldAudit.bindingDigest, outcome: "passed" },
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
    expect(retry).toMatchObject({ state: "reserved", values: { tree: reservedTree } });
    if (!retry) throw Error("Actual same-tree retry reservation required");
    const retryTree = retry.values['tree'];
    if (!isObjectId(retryTree)) throw Error("Actual retry reservation tree required");
    const retryPublication = factRefOf(await evidenceEntry(room.G, retry.id));
    const retryBinding: EvidenceBinding = { ...binding, subject: { kind: "landing", publication: retryPublication, manifest: change.manifest } };
    const { jobSeq, memberJob, bindingDigest } = await request(retryBinding, first.jobSeq);
    const freshAudit = await auditFor(memberJob);
    expect(freshAudit.job).not.toEqual(oldAudit.job);
    expect(freshAudit.binding?.subject).toEqual(retryBinding.subject);
    expect(await evidenceRecord(room, freshAudit.job)).toMatchObject({ state: "admitted", countedJob: null, result: null, tree: reservedTree });
    expect(await evidenceRecord(room, oldAudit.job)).toMatchObject({ state: "passed", result: oldResult });
    const memberResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: jobSeq, jobFact: memberJob,
      tree: retryTree, configuration: setup.configurationDigest, bindingDigest, outcome: "passed" }, expected: await change.lane.expected({ job: jobSeq, manifest: change.manifest.seq }) });
    const memberResult = factRefOf(await evidenceEntry(change.lane, memberResultSeq));
    await room.pause(room.nodes);
    expect(room.host.stand.refs.get("refs/heads/main")).toBe(before);
    const audit = freshAudit.audit, auditJob = freshAudit.job;
    expect(auditJob).not.toEqual(memberJob);
    const auditResultSeq = await change.lane.did(setup.service.actor, "check", { fields: { job: audit.id, jobFact: auditJob,
      tree: retryTree, configuration: setup.configurationDigest, bindingDigest: freshAudit.bindingDigest, outcome: "failed" }, expected: await change.lane.expected({ job: audit.id, manifest: change.manifest.seq }) });
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
