/** Real declared-lane execution; remote authority/admission messages are
 * explicitly scripted peers. G17/Rules authority is proved by native owners,
 * not by these messages. Work staging uses real hold code and a scripted Git host. */
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { namespace } from "@generalbusiness/dap-scope";
import type { FieldValue } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, evidenceBindingDigest, isSeed, scopeIdOf, textDigest, utf8, type EvidenceBinding } from "@generalbusiness/dap-bytes";
import { idOf } from "@generalbusiness/dap-git/tree-proof";
import { evidenceGraph } from "./support/evidence-graph.ts";
import { Peer, capable, net, onCode, paul, reader, rita, transport, una, vic } from "./support/graph.ts";

const oid = (c: string) => c.repeat(40);
const bindingOf = (g: Awaited<ReturnType<typeof evidenceGraph>>, checker: EvidenceBinding["checker"], subject: EvidenceBinding["subject"]): EvidenceBinding => ({
  v: 1, source: "member", stage: subject.kind, checker,
  policyGeneration: { rules: g.graph.rules.at, seq: 1 }, roomService: null, serviceGeneration: { rules: g.graph.rules.at, seq: 0 }, auditOf: null, subject,
});
const decision = async (g: Awaited<ReturnType<typeof evidenceGraph>>, lane: Awaited<ReturnType<typeof g.open>>, job: Awaited<ReturnType<typeof lane.fact>>, reason: string, triple: Record<string, string> = {}) => {
  const envelope = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "check-decision", fields: {
    job, decision: { self: true }, status: reason === "admitted" ? "admitted" : reason === "wrong-source" ? "refused" : "decided", reason, frozenGeneration: "null", observedGeneration: "null", ...triple,
  } } }, "platform:destination@17:evidence-admit");
  expect(await lane.stub.deliver(envelope)).toMatchObject({ answer: "recorded" });
};

test("evidence work source pins an actual staged root before any report, queues before native admission, binds the signed result, and releases only after a native terminal decision (Git/admission peers are STAND-INS)", { timeout: 30_000 }, async () => {
  const g = await evidenceGraph(), host = onCode(), lane = await g.open("open-issue");
  const commitBytes = utf8(`tree ${oid("d")}
parent ${oid("b")}
author TEST <test@artroom.invalid> 1700000000 +0000
committer TEST <test@artroom.invalid> 1700000000 +0000

TEST work
`), workCommit = idOf("commit", commitBytes);
  const terms = await lane.fact(0), commitment = (await lane.did(rita, "offer", { fields: { offeree: una.member } })).fact.seq;
  await lane.did(una, "accept", { on: commitment, fields: { terms } });
  const hold = (await lane.did(una, "take-hold", { fields: { commitment } })).fact.seq;
  await lane.instance(una, hold);
  const fields = { commitment, terms, commit: workCommit, destination: g.graph.destination.at };
  expect(await lane.asks(vic, "stage-work", { fields })).toBe("guard-failed");
  const staged = (await lane.stagedDid(una, "stage-work", { fields })).fact;
  expect(await lane.item(staged.seq)).toMatchObject({ type: "work-source", state: "staged", values: { commit: workCommit }, refs: { commitment } });
  expect((await lane.entries()).some(entry => entry.effects.some(effect => effect.effect === "open" && effect.type === "report"))).toBe(false);
  expect((await lane.state()).records("hold@1", "pin", { states: ["held"] }).some(pin => pin.values["admitted"] === staged.seq)).toBe(true);
  expect(host.asked).toContain("stage");
  net.hold = envelope => "scope" in envelope.to && envelope.to.scope === g.graph.destination.at.scope;
  const binding = bindingOf(g, paul.member, { kind: "work", source: staged }), digest = evidenceBindingDigest(binding);
  const job = (await lane.did(una, "request-work-check", { fields: { source: staged, name: "work", configuration: textDigest("TEST work config"), checker: paul.member,
    commitProof: canonicalize({ v: 1, id: workCommit, data: b64url(commitBytes) }), binding: canonicalize(binding), bindingDigest: digest } })).fact;
  const result = { job: job.seq, jobFact: job, tree: oid("d"), configuration: textDigest("TEST work config"), bindingDigest: digest, outcome: "passed" };
  expect((await lane.item(job.seq)).state).toBe("queued");
  expect(await lane.asks(paul, "check", { fields: result })).toBe("guard-failed: job-not-active");
  expect(await lane.asks(una, "release-work", { on: staged.seq })).toBe("guard-failed: work-check-pending");
  await decision(g, lane, job, "admitted", { commit: workCommit, tree: oid("d"), base: oid("b") });
  expect(await lane.asks(paul, "check", { fields: { ...result, bindingDigest: textDigest("different binding") } })).toBe("guard-failed: not-this-job");
  const actualResult = (await lane.did(paul, "check", { fields: result })).fact;
  expect(await lane.asks(una, "release-work", { on: staged.seq })).toBe("guard-failed: work-check-pending");
  await decision(g, lane, job, "counted");
  const alias = (await lane.did(una, "request-work-check", { fields: { source: staged, reuse: true, name: "work", configuration: textDigest("TEST work config"), checker: paul.member,
    commitProof: canonicalize({ v: 1, id: workCommit, data: b64url(commitBytes) }), binding: canonicalize(binding), bindingDigest: digest } })).fact;
  const reused = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "check-decision", fields: {
    job: alias, countedJob: job, result: actualResult, decision: { self: true }, status: "reused", reason: "reused", commit: workCommit, tree: oid("d"), base: oid("b"), frozenGeneration: "null", observedGeneration: "null",
  } } }, "platform:destination@17:evidence-admit");
  expect(await lane.stub.deliver(reused)).toMatchObject({ answer: "recorded" });
  expect(await lane.item(alias.seq)).toMatchObject({ state: "reused", refs: { countedJob: job.seq, countedResult: actualResult.seq } });
  expect((await lane.entries()).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "check")).toHaveLength(1);
  const secondBytes = utf8(new TextDecoder().decode(commitBytes).replace("TEST work", "TEST abandoned work")), secondCommit = idOf("commit", secondBytes);
  const secondSource = (await lane.stagedDid(una, "stage-work", { fields: { ...fields, commit: secondCommit } })).fact;
  const secondBinding = bindingOf(g, paul.member, { kind: "work", source: secondSource });
  const unresolved = (await lane.did(una, "request-work-check", { fields: { source: secondSource, name: "work", configuration: textDigest("TEST work config"), checker: paul.member,
    commitProof: canonicalize({ v: 1, id: secondCommit, data: b64url(secondBytes) }), binding: canonicalize(secondBinding), bindingDigest: evidenceBindingDigest(secondBinding) } })).fact;
  expect(await lane.asks(una, "release-work", { on: secondSource.seq, fields: { abandon: true, reason: "" } })).toBe("guard-failed: release-reason-required");
  expect(await lane.asks(vic, "release-work", { on: secondSource.seq, fields: { abandon: true, reason: "TEST abandon" } })).toBe("guard-failed");
  await lane.did(una, "release-work", { on: secondSource.seq, fields: { abandon: true, reason: "TEST owner explicitly released the source pin" } });
  expect((await lane.item(unresolved.seq)).state).toBe("queued");
  expect(await lane.item(secondSource.seq)).toMatchObject({ state: "released", values: { releaseReason: "TEST owner explicitly released the source pin" } });
  expect((await lane.state()).records("hold@1", "pin", { states: ["held"] }).some(pin => pin.values["admitted"] === staged.seq)).toBe(true);
  await lane.did(una, "release-work", { on: staged.seq });
  expect((await lane.state()).records("hold@1", "pin", { states: ["held"] }).some(pin => pin.values["admitted"] === staged.seq)).toBe(false);
  expect(await lane.asks(una, "request-work-check", { fields: { source: staged, name: "work", configuration: textDigest("TEST work config"), checker: paul.member,
    commitProof: canonicalize({ v: 1, id: workCommit, data: b64url(commitBytes) }), binding: canonicalize(binding), bindingDigest: digest } })).toBe("guard-failed: work-released");
});

test("a merged change accepts only its configured native peer's published job and retains one incident create without a human requester; typed refusals and the unproven child origin remain visible (SCRIPTED remote peers)", { timeout: 30_000 }, async ({ task }) => {
  const g = await evidenceGraph(); net.capability = capable;
  const lane = await g.open("open-change"); net.hold = () => true;
  const configuration = textDigest("TEST published config");
  const source = (await lane.did(rita, "propose-file", { fields: { base: oid("b"), path: "a.md", content: "a", digest: textDigest("a"), size: 1 } })).fact;
  const manifest = (await lane.did(rita, "propose-manifest", { fields: { base: oid("b"), files: [{ path: "a.md", entry: source, digest: textDigest("a") }] } })).fact;
  expect(await lane.stub.deliver(g.graph.rules.relate(lane.at, "rules", "published", { approvals: 0, checks: [], ownerMayReview: true,
    evidencePolicy: canonicalize({ roomService: null, serviceGeneration: { rules: g.graph.rules.at, seq: 0 }, policyGeneration: { rules: g.graph.rules.at, seq: 1 } }) }))).toMatchObject({ answer: "recorded" });
  const operation = (await lane.did(rita, "merge", { fields: { manifest: manifest.seq, reports: [] } })).fact;
  // The operation is an actual signed lane fact. Publication remains a
  // SCRIPTED sibling-peer message, not evidence of a Native write.
  expect(await lane.stub.deliver(g.graph.destination.relate(lane.at, "publication", "published", { operation, outcome: "published", commit: oid("c") }))).toMatchObject({ answer: "recorded" });
  expect((await lane.item(0)).state).toBe("merged");
  const publication = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "unused", fields: {} } }, "reserve").from;
  const receipt = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "unused", fields: {} } }, "push").from;
  const written = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "unused", fields: {} } }, "receipt").from;
  const binding = bindingOf(g, paul.member, { kind: "published", publication, receipt, written, manifest }), digest = evidenceBindingDigest(binding);
  const open = { class: "request", type: "tell", body: { message: "admit-published-check", fields: { operation, manifest, name: "published", configuration, tree: oid("d"), commit: oid("c"), base: oid("b"), checker: paul.member, binding: canonicalize(binding), bindingDigest: digest } } } as const;
  const wrong = new Peer("destination", "platform:destination");
  expect(wrong.at).not.toEqual(g.graph.destination.at);
  const denied = await lane.stub.deliver(wrong.sends(lane.at, open, "platform:destination@17:evidence-notice"));
  expect(denied).toMatchObject({ answer: "recorded" });
  if (denied.answer !== "recorded") return expect.fail("The wrong destination must reach a recorded refusal");
  const deniedEntry = await lane.entry(denied.fact.seq);
  expect(deniedEntry.input).toMatchObject({ type: "delivery", decision: "refused", reason: { code: "guard-failed", name: "not-the-destination" } });
  expect(deniedEntry.effects.some(effect => effect.effect === "open" && effect.type === "job")).toBe(false);
  const refusedOpen = { ...open, body: { ...open.body, fields: { ...open.body.fields, name: "refused" } } };
  expect(await lane.stub.deliver(g.graph.destination.sends(lane.at, refusedOpen, "platform:destination@17:evidence-notice"))).toMatchObject({ answer: "recorded" });
  const refusedJob = (await lane.state()).page("job", ["queued"], null, 64).items[0]!;
  await decision(g, lane, await lane.fact(refusedJob.id), "wrong-source");
  expect(await lane.item(refusedJob.id)).toMatchObject({ state: "fence-refused", values: { reason: "wrong-source", frozenGeneration: "null", observedGeneration: "null" } });
  const nativeOpen = g.graph.destination.sends(lane.at, open, "platform:destination@17:evidence-notice");
  const accepted = await lane.stub.deliver(nativeOpen);
  await lane.stub.deliver(nativeOpen);
  expect(accepted).toMatchObject({ answer: "recorded" });
  const jobs = (await lane.state()).page("job", ["queued"], null, 64).items;
  expect(jobs).toHaveLength(1); const job = await lane.fact(jobs[0]!.id);
  await decision(g, lane, job, "admitted", { commit: oid("c"), tree: oid("d"), base: oid("b") });
  await lane.did(paul, "check", { fields: { job: job.seq, jobFact: job, tree: oid("d"), configuration, bindingDigest: digest, outcome: "failed" } });
  await decision(g, lane, job, "counted");
  expect((await lane.item(job.seq)).state).toBe("failed");
  const notice = g.graph.destination.sends(lane.at, { class: "request", type: "tell", body: { message: "published-check-failure", fields: {
    job, publication, manifest, decision: { self: true }, cause: "TEST actual published failure", triagers: [rita.member], policyGeneration: canonicalize(binding.policyGeneration),
  } } }, "platform:destination@17:evidence-result");
  expect(await lane.stub.deliver(notice)).toMatchObject({ answer: "recorded" });
  const incidents = (await lane.state()).page("incident", ["creating"], null, 8192).items;
  expect(incidents).toHaveLength(1);
  const incident = incidents[0]!, entry = await lane.entry(incident.id), send = entry.sends.find(item => isSeed(item.to));
  expect(send && isSeed(send.to)).toBe(true);
  if (!send || !isSeed(send.to) || send.message.class !== "request" || send.message.type !== "create") return expect.fail("An actual incident create envelope is required");
  expect(send.to.creator).toEqual(lane.at); expect(send.to.definition).toBe(g.valid(g.issue).digest);
  expect((send.message.body as { fields: Record<string, FieldValue> }).fields).not.toHaveProperty("opener");
  // Duplicate delivery is the same native source pair. A second notification
  // for the same exact job also cannot allocate a replacement incident.
  await lane.stub.deliver(notice);
  const again = g.graph.destination.sends(lane.at, notice.message, "platform:destination@17:evidence-result");
  const duplicate = await lane.stub.deliver(again);
  expect(duplicate).toMatchObject({ answer: "recorded" });
  if (duplicate.answer !== "recorded") return expect.fail("A new notification must reach the incident identity guard");
  expect((await lane.entry(duplicate.fact.seq)).input).toMatchObject({ type: "delivery", decision: "refused", reason: { code: "guard-failed", name: "incident-exists" } });
  expect((await lane.state()).page("incident", ["creating", "created", "refused", "conflict", "unknown"], null, 8192).items).toHaveLength(1);
  net.hold = envelope => "scope" in envelope.to && envelope.to.scope === g.graph.destination.at.scope;
  const childName = scopeIdOf(send.to), clock = net.clock.now;
  // One bounded retry of the actual retained create, through the maintained
  // namespace transport. A previously held send may not yet be due in the
  // outbox; this does not mint a new cause, seed, signature or Native proof.
  const wire = namespace(env.NET), incidentFact = await lane.fact(incident.id);
  const parentSource = await wire.resolver.read(incidentFact, net.bounds.fetchSeconds, true);
  const retried = await wire.transport.send({ to: send.to, from: incidentFact, n: send.n, message: send.message });
  const activation = await transport.summary(childName, reader), first = await transport.entry(childName, reader, 0);
  const born = first.ok && first.value.entry.input.type === "genesis" ? first.value.entry.input : null;
  const result = first.ok ? first.value.entry.sends.find(item => item.message.class === "result")?.message : null;
  const measured = {
    qualification: "SCRIPTED remote peers; one actual retained create delivery and bounded reads, no Native G17 admission or positive child-origin proof",
    child: childName, source: incidentFact, ordinal: send.n, delivery: retried,
    parentUnder: parentSource && "entry" in parentSource ? parentSource.under : null,
    activation: activation.ok ? { status: activation.value.status, definition: activation.value.definition } : { reason: activation.reason },
    genesis: born ? { decision: born.decision, kind: born.kind, reason: result?.class === "result" ? result.reason ?? null : null } : first.ok ? { type: first.value.entry.input.type } : { reason: first.reason },
    incidentState: (await lane.item(incident.id)).state, clockUnchanged: net.clock.now === clock,
  };
  Object.assign(task.meta, { evidenceIncidentCreation: measured });
  const measurement = `TEST-declared-incident-creation-v1 ${JSON.stringify(measured)}`;
  // This custom office is not a native Directory. Its honest source label
  // cannot satisfy Issue4's incident fact guard under the reserved change
  // identity. Pin the actual refusal, rather than accepting an unread child.
  expect(measured.parentUnder, measurement).toBe("declared:change");
  expect(retried, measurement).toMatchObject({ answer: "recorded" });
  expect(measured.activation, measurement).toEqual({ status: "refused", definition: g.valid(g.issue).digest });
  expect(measured.genesis, measurement).toEqual({ decision: "refused", kind: "file", reason: { code: "guard-failed", name: "not-this-incident" } });
  expect(net.clock.now).toBe(clock);
  expect((await lane.entry(incident.id)).sends.find(item => item.n === send.n)).toEqual(send);
  // Actual child acceptance, attention and close behavior are commissioned
  // in the real Native story. A scripted destination cannot supply that
  // production origin, so this diagnostic makes no child-positive claim.
  expect((await lane.item(job.seq)).refs["incident"]).toBe(incident.id);
});
