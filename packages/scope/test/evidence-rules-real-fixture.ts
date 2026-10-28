import { expect } from "vitest";
import type { Answer, Digest, EvidenceBinding, FactRef, Intent, MemberRef, RulesObservation, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, evidenceBindingDigest, factRefOf, intentDigest, isDigest, isRecord, isSeed, readEvidenceBinding, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, invitationRedemptionFields } from "@generalbusiness/dap-client";
import { configurationDigest, type Configuration, type Notice, type Scopes, type Variable } from "../../checkers/src/index.ts";
import { idOf, parseCommit } from "@generalbusiness/dap-git";
import { keys, type Actor } from "@generalbusiness/dap-derive/testing";
import { RULES_CERTIFICATE_KIND, RULES_PATTERNS, RULES_TREE_PROOF } from "@generalbusiness/dap-platform";
import { EVIDENCE_RULES_COHORT } from "../../platform/src/evidence-cohort.ts";
import { rulesPolicyCheckersV13, rulesPolicyProposalV13, type RulesPolicyV13 } from "../../platform/src/rules-policy-v13.ts";
import { readEvidenceJobRecordWireV17 } from "../../platform/src/destination-evidence-v17.ts";
import { issueEvidence4 } from "../../../apps/room/lanes/src/issue4.ts";
import { changeEvidence4 } from "../../../apps/room/lanes/src/change4.ts";
import { hardeningItems, hardeningSealed } from "./certified-rules-hardening-fixture.ts";
import { DestinationHost, type DestinationProvider } from "../src/destination-host.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { readRulesTree } from "../src/rules-tree-provider.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, sam } from "./repository.ts";
import { reader, driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";

// Actual R22/D21/M8/Q13/G17 creation, observations, native grants and SQLite.
// Git/provider replies, task instance locator and callback scheduling are TEST stands.
// No external runner, task creation, hosted provider or deployment is proved here.
export async function evidenceNativeRoom() {
  const cohort = EVIDENCE_RULES_COHORT;
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false }), host = ownHost();
  const providerCalls: { commit: string; maxCanonicalBytes: number }[] = [];
  const gitRequests: { method: string; path: string }[] = [], fetch = host.stand.fetch;
  host.stand.fetch = request => {
    gitRequests.push({ method: request.method, path: new URL(request.url).pathname });
    return fetch(request);
  };
  const control: { heldRead: { entered(): void; release: Promise<void> } | null } = { heldRead: null };
  const forbidden = async (): Promise<never> => { throw Error("TEST certificate provider cannot perform another operation"); };
  const certificateProvider: DestinationProvider = {
    format: forbidden, mint: forbidden, revoke: forbidden, ref: forbidden, objects: forbidden, send: forbidden, inspect: forbidden, mintRead: forbidden,
    remote: () => { throw Error("TEST certificate provider has no remote transport"); },
    rulesTree: async (_repository, request) => {
      providerCalls.push({ ...request });
      const gate = control.heldRead;
      if (gate) { gate.entered(); await gate.release; }
      return readRulesTree({ object: async id => {
        const object = host.stand.objects.get(id);
        return object ? { type: object.type, size: object.data.length, data: object.data } : null;
      }, ref: async () => { throw Error("TEST tree read must not resolve a ref"); },
      refs: async () => { throw Error("TEST tree read must not list refs"); } }, request);
    },
  };
  const pause = async (nodes: readonly Platform[]) => {
    const callbacks = async () => {
      let joined = 0;
      for (const node of nodes) {
        const read = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
        if (!Number.isSafeInteger(read.callbacks) || read.callbacks < 0) throw Error("The fixture callback count is invalid");
        joined += read.callbacks;
      }
      return joined;
    };
    for (let pass = 0; pass < 64; pass++) {
      await callbacks(); await driveFixture(nodes, life.wait);
      if (await callbacks() === 0) return;
    }
    throw Error("The fixture exceeded 64 callback and driver rounds");
  };
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
      fields: { host: host.host, namespace: host.namespace, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: cohort.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
    const bindings = host.bindings(R.name);
    life.outside(R.name, (given, sql) => host.outside(given, sql, bindings));
    expect(await R.stub.create(signIntent(install, rita.secret), cohort.register)).toMatchObject({ answer: "accepted" });
    const found = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } });
    const D = life.platform(scopeIdOf({ v: 1, kind: "directory", definition: cohort.directory, creator: await R.at(), cause: intentDigest(found.intent), ordinal: 0 }));
    expect(await R.stub.submit(found, [])).toMatchObject({ answer: "accepted" }); await pause([R, D]);
    const directoryBirthEntry = (await D.entries())[0]!;
    const sibling = (kind: ScopeRef["kind"]) => {
      const send = directoryBirthEntry.sends.find(row => isSeed(row.to) && row.to.kind === kind);
      if (!send || !isSeed(send.to)) throw Error("Actual applied Directory sibling send required");
      return life.platform(scopeIdOf(send.to));
    };
    const M = sibling("membership"), Q = sibling("rules"), G = sibling("destination"), nodes = [R, D, M, Q, G];
    life.outside(G.name, (given, sql) => {
      const actual = host.outside(given, sql, bindings);
      const certificate = new DestinationHost(given, { host: host.host, namespace: host.namespace, provider: certificateProvider,
        custody: new CredentialStore(sql, () => given.scope()?.at ?? null) });
      return { ...actual, send: request => request.kind === RULES_CERTIFICATE_KIND && actual.accepts(request.owner, request.kind)
        ? certificate.send(request) : actual.send(request) };
    });
    await G.restart(); await pause(nodes);
    const seat = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    return { life, host, providerCalls, gitRequests, control, pause, R, D, M, Q, G, nodes, bindings };
  } catch (error) { life.release(); throw error; }
}
export type EvidenceRoom = Awaited<ReturnType<typeof evidenceNativeRoom>>;

/** Native observations carry their retained values beside the answer. */
export async function evidenceRulesObservation(room: EvidenceRoom) {
  const raw = await room.Q.stub.observe({ of: await room.Q.at(), asked: "rules" });
  if (!isRecord(raw) || Object.keys(raw).sort().join() !== "answer,values" || !isRecord(raw['answer']) || !Array.isArray(raw['values'])) throw Error("Actual Q13 answer and retained values required");
  const answer = raw['answer'] as unknown as Omit<RulesObservation, 'at'>;
  if (answer.subject !== "rules" || answer.definition !== "platform:rules@13" || answer.content.asked !== "rules" || !answer.content.serviceGeneration) throw Error("Actual Q13 evidence observation required");
  return { ...answer, content: answer.content, serviceGeneration: answer.content.serviceGeneration };
}

/** An exact retained entry read, independent of the history page ceiling. */
export async function evidenceEntry(node: Platform, seq: number) {
  const read = await node.stub.entry(reader, seq);
  if (!read.ok || read.value.entry.seq !== seq) throw Error("Actual retained native entry required");
  return read.value.entry;
}

export async function openEvidenceRulesCertificate(room: EvidenceRoom, policy: RulesPolicyV13): Promise<FactRef> {
  const proposal = rulesPolicyProposalV13(policy);
  if (!proposal.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  const signed = await G.intent(rita, RULES_CERTIFICATE_KIND, { on: 0, expected: await G.expected({ on: 0 }), fields: {
    proposal: proposal.digest, directoryBirth: factRefOf((await D.entries())[0]!),
    rulesBirth: factRefOf((await Q.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!),
  } });
  const answer = await G.stub.submit(signed, [], { values: [canonicalize(proposal.policy)] });
  expect(answer, canonicalize(answer)).toMatchObject({ answer: "accepted" });
  if (answer.answer !== "accepted") throw Error("Actual certificate opening required");
  return factRefOf(await evidenceEntry(G, answer.receipt.fact.seq));
}
export async function publishEvidenceRulesCertificate(room: EvidenceRoom, policy: RulesPolicyV13, request: FactRef, certificate: FactRef, proof: Digest, proofBytes: string, actor: Actor = rita) {
  const proposed = rulesPolicyProposalV13(policy);
  if (!proposed.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  return Q.stub.submit(await Q.intent(actor, "publish", { on: 0, expected: await Q.expected({ on: 0 }),
    fields: JSON.parse(canonicalize({ ...proposed.policy, roomService: canonicalize(proposed.policy.roomService), checkers: rulesPolicyCheckersV13(proposed.policy), proposal: proposed.digest, proof, certificateRequest: request, certificate,
      directoryBirth: factRefOf((await D.entries())[0]!), destinationBirth: factRefOf((await G.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!) })) }), [],
    { values: [canonicalize(proposed.policy), proofBytes] });
}
export async function configureEvidenceRules(room: EvidenceRoom, policy: RulesPolicyV13) {
  const request = await openEvidenceRulesCertificate(room, policy); await room.pause(room.nodes);
  const outcome = (await hardeningSealed(room.G)).map(row => row.entry).find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
  if (!outcome || outcome.input.type !== "outcome" || outcome.input.result !== "confirmed"
    || !outcome.effects.some(effect => effect.effect === "attempt" && effect.selected === true)) throw Error("Actual selected native certificate required");
  const body = outcome.input.evidence.body;
  if (!isRecord(body) || !isDigest(body["proof"])) throw Error("Actual proof digest required");
  const kept = await room.G.stub.retained(reader, "value", body["proof"], RULES_TREE_PROOF.domain);
  if (!kept.ok) throw Error("Actual retained proof required");
  const certificate = factRefOf(outcome);
  expect(await publishEvidenceRulesCertificate(room, policy, request, certificate, body["proof"], kept.value.bytes)).toMatchObject({ answer: "accepted" });
  return { request, certificate, proof: body["proof"] };
}

export async function evidenceCertificate(room: EvidenceRoom, policy: RulesPolicyV13) {
  const request = await openEvidenceRulesCertificate(room, policy);
  await room.pause(room.nodes);
  const outcome = (await hardeningSealed(room.G)).map(row => row.entry).find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
  if (!outcome || outcome.input.type !== "outcome" || outcome.input.result !== "confirmed"
    || !outcome.effects.some(effect => effect.effect === "attempt" && effect.selected === true)) throw Error("Actual selected certificate required");
  const body = outcome.input.evidence.body;
  if (!isRecord(body) || !isDigest(body['proof'])) throw Error("Actual retained proof identity required");
  const read = await room.G.stub.retained(reader, "value", body['proof'], RULES_TREE_PROOF.domain);
  if (!read.ok) throw Error("Actual retained certificate proof required");
  return { request, certificate: factRefOf(outcome), proof: body['proof'], proofBytes: read.value.bytes };
}

export function evidenceRulesPolicy(roomService: RulesPolicyV13['roomService'], checks: RulesPolicyV13['checks'] = []): RulesPolicyV13 {
  return { approvals: 1, ownerMayReview: false, roomService, checks, labels: [], extents: [
    { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
    { name: "readme", patterns: ["README.md"], approvals: 1, approver: "change.review", checks: [], class: "content" },
    { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
  ] };
}

/** All identities come from actual creation and activation, never a scripted peer. */
export async function evidenceDefinitions(room: EvidenceRoom) {
  const issue = issueEvidence4, issueId = definitionDigest(issue), change = changeEvidence4(issueId), changeId = definitionDigest(change);
  for (const [definition, digest] of [[issue, issueId], [change, changeId]] as const) {
    const answer = await room.Q.stub.submit(await room.Q.intent(rita, "activate", { fields: { digest, name: definition.name } }), [],
      { values: [canonicalize(issue), canonicalize(change)] });
    expect(answer, canonicalize(answer)).toMatchObject({ answer: "accepted" });
  }
  return { issue: issueId, change: changeId, issueBytes: canonicalize(issue), changeBytes: canonicalize(change) };
}

export async function evidenceChecker(room: EvidenceRoom, actor: Actor = keys.paul, handle = "@service") {
  const secret = b64url(new Uint8Array(32).fill(handle === "@service" ? 93 : 94)); // Public TEST invitation seed.
  const invitation = await room.M.did(rita, "invite-member", { fields: { handle, role: "checker",
    ...invitationIssueFields(EVIDENCE_RULES_COHORT.membership, secret), inviteEnds: soon(3600) } });
  await room.M.did(actor, "join", { fields: invitationRedemptionFields(EVIDENCE_RULES_COHORT.membership, await room.M.at(), invitation, actor.key, secret) });
  await room.pause(room.nodes);
  return { actor, memberItem: invitation, member: { membership: await room.M.at(), member: handle } as MemberRef };
}

type NativeReadPort = Platform['stub'] & {
  prepare(signed: SignedIntent, grants: readonly [], capability: string, step: string): Promise<Answer>;
  stageSnapshot(signed: SignedIntent): ReturnType<NonNullable<Scopes['stageSnapshot']>>;
};

export function evidenceScopes(room: EvidenceRoom): Scopes {
  const node = (at: ScopeRef) => room.life.platform(at.scope);
  return {
    entry: async (at, seq) => { const read = await node(at).stub.entry(reader, seq); return read.ok ? read.value : null; },
    pinned: async at => (await node(at).summary()).value.definition,
    activated: async digest => { const item = (await hardeningItems(room.Q, "definition")).find(row => row.values['digest'] === digest); return item ? { name: String(item.values['name']), state: item.state } : null; },
    configuration: async digest => { const read = await room.Q.stub.retained(reader, "value", digest, "artroom-check-configuration-1"); return read.ok ? read.value.bytes : null; },
    standing: async (at, job) => {
      const lane = node(at), held = (await hardeningItems(lane, "job")).find(row => row.id === job);
      if (!held) return null;
      const manifest = held.refs['manifest'];
      return { state: held.state, expected: await lane.expected({ job, ...(typeof manifest === "number" ? { manifest } : {}) }) };
    },
    prepare: (at, signed, capability, step) => (node(at).stub as NativeReadPort).prepare(signed, [], capability, step),
    stageSnapshot: (_at, signed) => (room.G.stub as NativeReadPort).stageSnapshot(signed),
    submit: (at, signed) => node(at).stub.submit(signed, []),
  };
}

export interface EvidenceWorkOptions {
  image?: Digest;
  environment?: readonly Variable[];
  source?: "member" | "room";
  reuse?: boolean;
}

/** Stage and admit real work; the task-instance locator is a labelled provider fixture, not a Task authority claim. */
export async function prepareEvidenceWork(room: EvidenceRoom, options: EvidenceWorkOptions = {}) {
  const definitions = await evidenceDefinitions(room), service = await evidenceChecker(room), membership = await room.M.at();
  const configuration: Configuration = { name: "work", image: options.image ?? `sha256:${"1".repeat(64)}`,
    environment: [...options.environment ?? []], steps: [["/bin/sh", "-c", "test -f README.md && printf 'ok\\n'"]],
    judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds: 60, outputBytes: 65536 } };
  const digest = configurationDigest(configuration);
  const kept = await room.Q.stub.submit(await room.Q.intent(rita, "keep-configuration", { fields: { digest, name: configuration.name } }), [], { values: [canonicalize(configuration)] });
  expect(kept, canonicalize(kept)).toMatchObject({ answer: "accepted" });
  const source = options.source ?? "room";
  const policy: RulesPolicyV13 = { approvals: 1, ownerMayReview: false, roomService: { checker: service.member, key: service.actor.key },
    checks: [{ name: configuration.name, configuration: digest, required: false, checker: service.member, source, stage: "work", reuse: true }], labels: [], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "readme", patterns: ["README.md"], approvals: 1, approver: "change.review", checks: [], class: "content" },
      { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] };
  await configureEvidenceRules(room, policy);
  const opened = await room.D.stub.submit(await room.D.intent(rita, "open-issue", { expected: await room.D.expected({ repository: 0 }),
    fields: { definition: definitions.issue, title: "Native evidence work", conditions: ["Run the exact staged work tree"] } }), [], { values: [definitions.issueBytes] });
  expect(opened, canonicalize(opened)).toMatchObject({ answer: "accepted" });
  if (opened.answer !== "accepted") throw Error("Native Issue creation required");
  const created = await room.D.created(opened.receipt.fact.seq), lane = room.life.platform(created.name);
  room.nodes.push(lane); room.life.outside(lane.name, (given, sql) => room.host.outside(given, sql, room.bindings));
  await lane.restart(); await room.pause(room.nodes);
  expect((await lane.summary()).value.definition).toBe(definitions.issue);
  const terms = factRefOf((await lane.entries())[0]!);
  const commitment = await lane.did(rita, "offer", { fields: { offeree: { membership, member: "@rita" } } });
  await lane.did(rita, "accept", { on: commitment, expected: await lane.expected({ on: commitment }), fields: { terms } });
  const hold = await lane.did(rita, "take-hold", { fields: { commitment }, expected: await lane.expected({ commitment }) });
  const instance: Intent = { v: 1, to: await lane.at(), actor: rita.key, kind: "hold@1:instance", on: null, expected: {},
    fields: { hold, task: { ...(await lane.at()), kind: "task" }, instance: "TEST-native-evidence-instance" }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  expect(await (lane.stub as NativeReadPort).prepare(signIntent(instance, rita.secret), [], "hold@1", "instance")).toMatchObject({ answer: "accepted" });
  const base = room.host.stand.refs.get("refs/heads/main");
  const initial = base && room.host.stand.objects.get(base);
  if (!base || !initial || initial.type !== "commit") throw Error("Actual fixture initial commit required");
  const tree = parseCommit(initial.data).tree;
  const commitBytes = utf8(`tree ${tree}\nparent ${base}\nauthor TEST <test@artroom.invalid> 1700000000 +0000\ncommitter TEST <test@artroom.invalid> 1700000000 +0000\n\nNative evidence work\n`);
  const commit = idOf("commit", commitBytes);
  room.host.stand.objects.set(commit, { id: commit, type: "commit", data: commitBytes });
  const signed = await lane.intent(rita, "stage-work", { fields: { commitment, terms, commit, destination: await room.G.at() }, expected: await lane.expected({ commitment }) });
  const staged = await (lane.stub as NativeReadPort).prepare(signed, [], "hold@1", "stage");
  expect(staged, canonicalize(staged)).toMatchObject({ answer: "accepted" });
  await room.pause(room.nodes);
  const accepted = await lane.stub.submit(signed, []);
  expect(accepted, canonicalize(accepted)).toMatchObject({ answer: "accepted" });
  if (accepted.answer !== "accepted") throw Error("Actual staged work admission required");
  const stagedSource = accepted.receipt.fact;
  const observed = await evidenceRulesObservation(room);
  const binding: EvidenceBinding = { v: 1, source, stage: "work", checker: service.member,
    policyGeneration: { rules: await room.Q.at(), seq: observed.revision }, roomService: policy.roomService,
    serviceGeneration: observed.serviceGeneration, auditOf: null, subject: { kind: "work", source: stagedSource } };
  const bindingDigest = evidenceBindingDigest(binding), commitProof = canonicalize({ v: 1, id: commit, data: b64url(commitBytes) });
  const job = await lane.did(rita, "request-work-check", { fields: { source: stagedSource, name: configuration.name, configuration: digest,
    checker: service.member, binding: canonicalize(binding), bindingDigest, commitProof, reuse: options.reuse === true }, expected: await lane.expected({ source: stagedSource.seq }) });
  const jobFact = factRefOf(await evidenceEntry(lane, job));
  await room.pause(room.nodes);
  expect(await lane.item(job)).toMatchObject({ state: "requested", values: { tree, base, commit, reason: "admitted" } });
  const notice: Notice = { lane: await lane.at(), job: jobFact, name: configuration.name, tree };
  const record = async () => {
    const rows = await hardeningItems(room.G, "evidence-job");
    const found = rows.map(row => readEvidenceJobRecordWireV17(row.values['record'])).find(row => row && canonicalize(row.job) === canonicalize(jobFact));
    if (!found) throw Error("Actual G17 job record required");
    return found;
  };
  const assertCounted = async () => {
    await room.pause(room.nodes);
    const actual = await record();
    expect(actual).toMatchObject({ state: "passed", signer: service.actor.key });
    const result = (await hardeningSealed(lane)).find(sealed => actual.result && canonicalize(factRefOf(sealed.entry)) === canonicalize(actual.result));
    expect(result?.entry.input).toMatchObject({ type: "act", signed: { intent: { kind: "check", actor: service.actor.key } } });
    return actual;
  };
  return { lane, service, configuration, configurationDigest: digest, binding, bindingDigest, stagedSource, job: jobFact,
    notice, scopes: evidenceScopes(room), definitions: { issue: definitions.issue, change: definitions.change }, commit, tree, base, commitProof, policy, record, assertCounted };
}
export type PreparedEvidenceWork = Awaited<ReturnType<typeof prepareEvidenceWork>>;

export async function evidenceRecord(room: EvidenceRoom, job: FactRef) {
  const rows = [...await hardeningItems(room.G, "evidence-job"), ...await hardeningItems(room.G, "evidence-request")];
  const found = rows.map(row => readEvidenceJobRecordWireV17(row.values['record']))
    .find(record => record && canonicalize(record.job) === canonicalize(job));
  if (!found) throw Error("Actual G17 admitted or refused record required");
  return found;
}

/** Another explicit request, with the caller's stated generation. No automatic fence repair. */
export async function requestEvidenceWork(room: EvidenceRoom, prepared: PreparedEvidenceWork, options: { reuse?: boolean; binding?: EvidenceBinding } = {}) {
  const binding = options.binding ?? prepared.binding, bindingDigest = evidenceBindingDigest(binding);
  const seq = await prepared.lane.did(rita, "request-work-check", { fields: { source: prepared.stagedSource, name: prepared.configuration.name,
    configuration: prepared.configurationDigest, checker: binding.checker, binding: canonicalize(binding), bindingDigest,
    commitProof: prepared.commitProof, reuse: options.reuse === true }, expected: await prepared.lane.expected({ source: prepared.stagedSource.seq }) });
  const job = factRefOf(await evidenceEntry(prepared.lane, seq));
  await room.pause(room.nodes);
  return { job, binding, bindingDigest, record: () => evidenceRecord(room, job) };
}

/** An actual member-signed outcome claim. This helper runs no checker process. */
export async function claimEvidenceWork(room: EvidenceRoom, prepared: PreparedEvidenceWork,
  job: { job: FactRef; bindingDigest: Digest }, outcome: "passed" | "failed", actor: Actor = prepared.service.actor) {
  const seq = await prepared.lane.did(actor, "check", { fields: { job: job.job.seq, jobFact: job.job, tree: prepared.tree,
    configuration: prepared.configurationDigest, bindingDigest: job.bindingDigest, outcome }, expected: await prepared.lane.expected({ job: job.job.seq }) });
  const result = factRefOf(await evidenceEntry(prepared.lane, seq));
  await room.pause(room.nodes);
  return result;
}

export async function enrolEvidenceKey(room: EvidenceRoom, service: PreparedEvidenceWork['service'], actor: Actor) {
  const secret = b64url(new Uint8Array(32).fill(95)); // Public TEST invitation seed.
  const invitation = await room.M.did(rita, "invite-key", { fields: { member: service.memberItem, kind: "checker",
    ...invitationIssueFields(EVIDENCE_RULES_COHORT.membership, secret), inviteEnds: soon(3600) }, expected: await room.M.expected({ member: service.memberItem }) });
  await room.M.did(actor, "enrol", { on: 0, fields: invitationRedemptionFields(EVIDENCE_RULES_COHORT.membership, await room.M.at(), invitation, actor.key, secret),
    expected: await room.M.expected({ on: 0, member: service.memberItem }) });
  await room.pause(room.nodes);
}

export async function preparePublishedEvidence(room: EvidenceRoom) {
  const definitions = await evidenceDefinitions(room), service = await evidenceChecker(room);
  const configuration: Configuration = { name: "published", image: `sha256:${"2".repeat(64)}`, environment: [], steps: [["/bin/true"]],
    judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds: 60, outputBytes: 65536 } };
  const digest = configurationDigest(configuration);
  expect(await room.Q.stub.submit(await room.Q.intent(rita, "keep-configuration", { fields: { digest, name: configuration.name } }), [], { values: [canonicalize(configuration)] }))
    .toMatchObject({ answer: "accepted" });
  const ordinary = evidenceRulesPolicy({ checker: service.member, key: service.actor.key }, [{ name: configuration.name, configuration: digest, required: false,
    checker: service.member, source: "member", stage: "published", holds: true }]);
  const policy: RulesPolicyV13 = { ...ordinary, approvals: 0, allowZeroApprovals: true, extents: ordinary.extents.map(extent => extent.name === "rules" ? extent
    : { ...extent, approvals: 0, allowZeroApprovals: true, checks: [configuration.name] }) };
  await configureEvidenceRules(room, policy);
  return { definitions, service, configuration, configurationDigest: digest, policy, paths: ["README.md", "evidence.md"] };
}
export type PreparedPublishedEvidence = Awaited<ReturnType<typeof preparePublishedEvidence>>;

/** Publish an actual successor generation, optionally with different kept configuration bytes. */
export async function revisePublishedEvidence(room: EvidenceRoom, setup: PreparedPublishedEvidence, revision: { label: string; image?: Digest }) {
  const configuration = { ...setup.configuration, ...(revision.image ? { image: revision.image } : {}) }, digest = configurationDigest(configuration);
  if (digest !== setup.configurationDigest) {
    expect(await room.Q.stub.submit(await room.Q.intent(rita, "keep-configuration", { fields: { digest, name: configuration.name } }), [], { values: [canonicalize(configuration)] }))
      .toMatchObject({ answer: "accepted" });
  }
  const policy: RulesPolicyV13 = { ...setup.policy, labels: [revision.label], checks: setup.policy.checks.map(check => ({ ...check, configuration: digest })) };
  await configureEvidenceRules(room, policy);
  return { ...setup, configuration, configurationDigest: digest, policy };
}

export async function prepareAuditEvidence(room: EvidenceRoom): Promise<PreparedPublishedEvidence> {
  const definitions = await evidenceDefinitions(room), service = await evidenceChecker(room);
  const configuration: Configuration = { name: "unit", image: `sha256:${"3".repeat(64)}`, environment: [], steps: [["/bin/true"]],
    judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds: 60, outputBytes: 65536 } };
  const digest = configurationDigest(configuration);
  expect(await room.Q.stub.submit(await room.Q.intent(rita, "keep-configuration", { fields: { digest, name: configuration.name } }), [], { values: [canonicalize(configuration)] }))
    .toMatchObject({ answer: "accepted" });
  const ordinary = evidenceRulesPolicy({ checker: service.member, key: service.actor.key }, [
    { name: "unit", configuration: digest, required: true, checker: service.member, audit: { check: "room-unit", every: 1 } },
    { name: "room-unit", configuration: digest, required: false, checker: service.member, source: "room", stage: "landing" },
  ]);
  const policy: RulesPolicyV13 = { ...ordinary, approvals: 0, allowZeroApprovals: true, extents: ordinary.extents.map(extent => extent.name === "rules" ? extent
    : { ...extent, approvals: 0, allowZeroApprovals: true, checks: [configuration.name] }) };
  await configureEvidenceRules(room, policy);
  return { definitions, service, configuration, configurationDigest: digest, policy, paths: ["evidence.md"] };
}

/** A real Change manifest and merge. The job reader demands its actual automatic published job. */
export async function publishEvidenceFile(room: EvidenceRoom, setup: PreparedPublishedEvidence, title: string) {
  const opening = await room.D.stub.submit(await room.D.intent(rita, "open-pr", { fields: { definition: setup.definitions.change, title, draft: false },
    expected: await room.D.expected({ repository: 0 }) }), [], { values: [setup.definitions.changeBytes, setup.definitions.issueBytes] });
  expect(opening, canonicalize(opening)).toMatchObject({ answer: "accepted" });
  if (opening.answer !== "accepted") throw Error("Actual Change creation required");
  const created = await room.D.created(opening.receipt.fact.seq), lane = room.life.platform(created.name);
  room.nodes.push(lane); room.life.outside(lane.name, (given, sql) => room.host.outside(given, sql, room.bindings));
  await lane.restart(); await room.pause(room.nodes);
  await lane.did(rita, "ask-rules", { on: 0, expected: await lane.expected({ on: 0 }) });
  await room.pause(room.nodes);
  const laneRules = (await hardeningItems(lane, "rules"))[0];
  if (!laneRules) throw Error("Actual related Q13 policy required");
  const base = room.host.stand.refs.get("refs/heads/main");
  if (!base) throw Error("Actual current published commit required");
  const content = title + "\n", size = utf8(content).length, digest = digestBytes(utf8(content));
  const files = [];
  for (const path of setup.paths) {
    const file = await lane.did(rita, "propose-file", { fields: { base, path, content, size, digest }, expected: await lane.expected({ proposal: 0 }) });
    files.push({ path, entry: factRefOf(await evidenceEntry(lane, file)), digest });
  }
  const manifest = await lane.did(rita, "propose-manifest", { fields: { base, files },
    expected: await lane.expected({ proposal: 0 }) });
  const merge = await lane.did(rita, "merge", { fields: { manifest, reports: [] }, expected: await lane.expected({ proposal: 0, manifest, rules: laneRules.id }) });
  const operation = factRefOf(await evidenceEntry(lane, merge));
  await room.pause(room.nodes);
  return { lane, manifest: factRefOf(await evidenceEntry(lane, manifest)), operation, base,
    job: async () => {
      const jobs = (await hardeningItems(lane, "job")).filter(item => item.values['stage'] === "published");
      expect(jobs).toHaveLength(1);
      const held = jobs[0]!;
      expect(held).toMatchObject({ state: "requested", values: { reason: "admitted" } });
      const sealed = (await hardeningSealed(lane)).find(row => row.entry.seq === held.id);
      if (!sealed) throw Error("Actual automatic published job entry required");
      const binding = typeof held.values['binding'] === "string" ? readEvidenceBinding(JSON.parse(held.values['binding'])) : null;
      if (!binding || binding.stage !== "published" || binding.subject.kind !== "published") throw Error("Actual published subject binding required");
      const job = factRefOf(sealed.entry), record = await evidenceRecord(room, job);
      expect(record).toMatchObject({ state: "admitted", job, binding });
      expect(room.host.stand.refs.get("refs/heads/main")).toBe(record.commit);
      return { job, binding, bindingDigest: record.bindingDigest, record };
    } };
}

export async function claimPublishedEvidence(room: EvidenceRoom, setup: PreparedPublishedEvidence,
  publication: EvidencePublication, job: PublishedEvidenceJob, outcome: "passed" | "failed") {
  const seq = await publication.lane.did(setup.service.actor, "check", { fields: { job: job.job.seq, jobFact: job.job, tree: job.record.tree!, configuration: setup.configurationDigest,
    bindingDigest: job.bindingDigest, outcome }, expected: await publication.lane.expected({ job: job.job.seq, manifest: publication.manifest.seq }) });
  const result = factRefOf(await evidenceEntry(publication.lane, seq));
  await room.pause(room.nodes);
  return result;
}
export type EvidencePublication = Awaited<ReturnType<typeof publishEvidenceFile>>;
export type PublishedEvidenceJob = Awaited<ReturnType<EvidencePublication['job']>>;
