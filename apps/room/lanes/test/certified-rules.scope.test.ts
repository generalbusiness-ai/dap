import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import type { DeclaredDefinition, Digest, FactRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, definitionDigest, factRefOf, isDigest, isRecord, isSeed, scopeIdOf, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, RULES_PATTERNS, RULES_TREE_PROOF, rulesPolicyProposalV11, CONFIGURATION_DOMAIN, editObjects, type RulesPolicyV11 } from "@generalbusiness/dap-platform";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { invitationIssueFields, invitationRedemptionFields, secretSigner, signedDeviceApplicationInstall } from "@generalbusiness/dap-client";
import { outsideOf as hostOutside } from "../../../../packages/scope/src/worker.ts";
import { soon } from "../../../../packages/scope/test/net.ts";
import { rita, sam } from "../../../../packages/scope/test/repository.ts";
import { reader, dispatchFixture, effectFixture, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings } from "../../../../packages/scope/test/fixtures-native.ts";
import { fixedSigner } from "../../../../packages/scope/test/fixtures-core.ts";
import { devicePackageFixture } from "../../../../packages/derive/test/fixtures-device-command.ts";
import { valueDigest } from "@generalbusiness/dap-derive";
import { changeDemo, changeDemo3 } from "../src/index.ts";

import { certifiedNativeRoom, openRulesCertificate, publishRulesCertificate, configureRules } from "../../../../packages/scope/test/certified-rules-fixture.ts";

// Actual new-family interpretation/SQLite and signed grants. The Git object
// provider, package HTTP, clock and bounded scheduler are explicit TEST stands.
// This does not exercise isolated provider HTTP or a deployed service.
test("certified-rules native birth and device install bootstrap a real tree certificate and reject an intervening native head", { timeout: 30_000 }, async () => {
  const cohort = ARCHIVE_CERTIFIED_RULES_COHORT;
  const declared: DeclaredDefinition = {
    ...devicePackageFixture,
    items: { ...devicePackageFixture.items, root: { ...devicePackageFixture.items["root"]!, refs: {
      destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } },
    } } },
    acts: { ...devicePackageFixture.acts,
      start: { ...devicePackageFixture.acts["start"]!, fields: { destination: { type: "scope", kind: "destination", required: true } },
        effects: [{ ref: { slot: "destination", from: { field: "destination" } } }] },
      report: { ...devicePackageFixture.acts["report"]!, also: { root: { item: "root", one: true } },
        fields: { ...devicePackageFixture.acts["report"]!.fields, path: { type: "text", max: 256, required: true }, content: { type: "text", max: 1024, required: true } },
        sends: [{ tell: { to: { slot: "destination", of: "also.root" }, message: "publish-file",
          fields: { path: { field: "path" }, content: { field: "content" } }, result: { refused: [], undelivered: [] } } }],
      },
    },
  };
  const id = definitionDigest(declared);
  const packet = await packApplication2({ name: "test.device-file-publication", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(declared) }],
    connections: [{ from: id, item: "root", slot: "destination", to: "outside" }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] },
    capabilities: [{ name: DEVICE_COMMAND, bounds: { kinds: ["heater"], owners: 1 } }],
    roles: { admin: ["command", "start"] }, projections: { root: readApplicationProjection({ v: 1, definition: id, revision: "revision",
      sources: { root: { item: "root", read: "one", states: ["ready"], limit: 1, fields: {} } } }) }, predecessor: null,
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }],
    descriptions: {}, views: {}, resources: {} } }, fixedSigner(81));
  const room = await certifiedNativeRoom();
  const { life, host, providerCalls, control, pause, R, D, M, Q, G, nodes } = room;
  try {
    const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
    const applicationBindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fixture.trust), env.SCOPE_INDEX);
    for (const node of [D, Q]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, applicationBindings, peer.fetch)); await node.restart(); }
    const membership = await M.at();
    const prepared = await signedDeviceApplicationInstall(secretSigner(rita.secret), packet.bytes,
      { rules: await Q.at(), uri: fixture.uri, release: packet.ids.release, roles: ["admin"], values: {}, owner: { membership, member: "@rita" } },
      { now: life.now(), idempotencyKey: "TEST-certified-rules-device-install" });
    const installed = await Q.stub.submit(prepared.signed, [], prepared.beside);
    expect(installed).toMatchObject({ answer: "accepted" });
    if (installed.answer !== "accepted") throw Error("The actual signed device package must install");
    await effectFixture([Q], life.wait); await dispatchFixture(nodes, life.wait);
    const creation = (await D.entries()).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === id);
    if (!creation || !isSeed(creation.to)) throw Error("Actual device application creation send required");
    expect(creation.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true,
      deviceCommand: { capability: DEVICE_COMMAND, owner: { membership, member: "@rita" }, root: id, definitions: [id] } } } });
    const C = life.platform(scopeIdOf(creation.to)); nodes.push(C); await pause(nodes);
    for (const [node, pin] of [[R, cohort.register], [D, cohort.directory], [M, cohort.membership], [Q, cohort.rules], [G, cohort.destination]] as const)
      expect((await node.summary()).value.definition).toBe(pin);
    expect(await Q.item(installed.receipt.fact.seq)).toMatchObject({ state: "active", refs: { scope: await C.at() } });
    expect((await C.item(0)).refs["destination"]).toEqual(await G.at());
    const device = await C.did(rita, "commission", { fields: { kind: "heater" } });
    await C.did(rita, "command", { on: device, expected: await C.expected({ on: device }), fields: { target: "on", level: 80 } });
    expect(await C.item(device)).toMatchObject({ values: { kind: "heater", target: "on", level: 80 } });
    expect((await G.item(0)).state).toBe("ready");
    const firstHead = host.stand.refs.get("refs/heads/main"); expect(firstHead).toMatch(/^[0-9a-f]{40}$/);
    expect((await Q.item(0)).values["configured"]).toBe(false);

    // A real native change lane, signed independent review and ordinary
    // reserve send reach G14 while its Q11 sibling is still unconfigured.
    const changeDigest = definitionDigest(changeDemo), changeBytes = canonicalize(changeDemo);
    expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest: changeDigest, name: "change" } }), [], { values: [changeBytes] })).toMatchObject({ answer: "accepted" });
    const opening = await D.stub.submit(await D.intent(rita, "open-pr", { fields: { definition: changeDigest, title: "unconfigured native reserve", draft: false }, expected: await D.expected({ repository: 0 }) }), [], { values: [changeBytes] });
    if (opening.answer !== "accepted") throw new Error(`open-pr was not accepted: ${JSON.stringify(opening)}`);
    const opened = opening.receipt.fact.seq;
    const L = life.platform((await D.created(opened)).name); nodes.push(L); await pause(nodes);
    const secret = b64url(new Uint8Array(32).fill(91)); // Public TEST seed, never operator custody.
    const invitation = await M.did(rita, "invite-member", { fields: { handle: "@sam", role: "member", ...invitationIssueFields(cohort.membership, secret), inviteEnds: soon(3600) } });
    await M.did(sam, "join", { fields: invitationRedemptionFields(cohort.membership, await M.at(), invitation, sam.key, secret) });
    const content = "# Certified room proposal\n";
    const manifest = await L.did(rita, "propose-file", { fields: { base: firstHead!, path: "native.md", digest: digestBytes(utf8(content)), size: utf8(content).length, content }, expected: await L.expected({ proposal: 0 }) });
    await L.did(sam, "review-verdict", { fields: { manifest, verdict: "approve" } });
    const pushes = host.stand.pushes.length;
    await L.did(rita, "merge", { fields: { manifest, reports: [] } }); await pause(nodes);
    expect((await G.summary()).value.items.filter(item => item.type === "publication"))
      .toEqual(expect.arrayContaining([expect.objectContaining({ state: "not-reserved", values: expect.objectContaining({ reason: "rules-not-configured" }) })]));
    expect(host.stand.refs.get("refs/heads/main")).toBe(firstHead); expect(host.stand.pushes).toHaveLength(pushes);

    const proposed = rulesPolicyProposalV11({ approvals: 1, ownerMayReview: false, checks: [], labels: [], extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "readme", patterns: ["README.md"], approvals: 1, approver: "change.review", checks: [], class: "content" },
      { name: "other", patterns: [], approvals: 1, approver: "change.review", checks: [], class: "content" },
    ] });
    if (!proposed.ok) throw Error("The real certified proposal must satisfy strict policy grammar");
    const certify = () => openRulesCertificate(room, proposed.policy);
    const started = await certify(); await pause(nodes);
    const outcome = (await G.entries()).find(entry => entry.input.type === "outcome" && entry.input.operation === `${started.seq}:0`);
    if (!outcome || outcome.input.type !== "outcome") throw Error("Actual native certificate outcome required");
    expect(outcome.input).toMatchObject({ kind: RULES_CERTIFICATE_KIND, result: "confirmed", evidence: { basis: "own-answer", body: { proposal: proposed.digest, started } } });
    expect(outcome.effects).toEqual(expect.arrayContaining([expect.objectContaining({ effect: "attempt", operation: `${started.seq}:0`, selected: true })]));
    expect(outcome.seq).toBe(started.seq + 1);
    const certificate = factRefOf(outcome), body = outcome.input.evidence.body;
    if (!isRecord(body) || !isDigest(body["proof"])) throw Error("The actual certificate must name its proof");
    const proof = body["proof"], kept = await G.stub.retained(reader, "value", proof, RULES_TREE_PROOF.domain);
    expect(kept).toMatchObject({ ok: true }); if (!kept.ok) throw Error("Actual certificate proof must be retained");
    const publish = (request: FactRef, answer: FactRef) => publishRulesCertificate(room, proposed.policy, request, answer, proof, kept.value.bytes);
    expect(await publish(started, certificate)).toMatchObject({ answer: "accepted" });
    const configured = await Q.item(0);
    expect(configured.values).toMatchObject({ configured: true, proposal: proposed.digest, policy: proposed.policy,
      certificate: { request: started, certificate, proof, commit: firstHead } });
    expect(rulesPolicyProposalV11(configured.values["policy"])).toEqual(proposed);
    expect(providerCalls).toHaveLength(1); expect(providerCalls[0]!.commit).toBe(firstHead);
    expect(providerCalls[0]!.maxCanonicalBytes).toBeLessThanOrEqual(262144);

    // Real host await and a real signed G14 entry, not a view/head edit.
    let entered!: () => void, release!: () => void;
    const waiting = new Promise<void>(resolve => { entered = resolve; });
    const releaseRead = new Promise<void>(resolve => { release = resolve; });
    let staleRequest: FactRef | null = null, running: ReturnType<typeof effectFixture> | null = null;
    try {
      control.heldRead = { entered, release: releaseRead };
      staleRequest = await certify();
      running = effectFixture([G], life.wait);
      await Promise.race([waiting, running.then(() => { throw Error("The actual certificate provider was not reached"); })]);
      const intervening = await G.did(rita, "read-token", { on: 0, expected: await G.expected({ on: 0 }), fields: { hours: 1 } });
      expect(intervening).toBeGreaterThan(staleRequest.seq); expect(host.stand.refs.get("refs/heads/main")).toBe(firstHead);
    } finally { release(); control.heldRead = null; if (running) await running; }
    if (!staleRequest) throw Error("Actual stale certificate opening required");
    await pause(nodes);
    const staleOutcome = (await G.entries()).find(entry => entry.input.type === "outcome" && entry.input.operation === `${staleRequest.seq}:0`);
    if (!staleOutcome || staleOutcome.input.type !== "outcome") throw Error("The interrupted attempt must record its actual outcome");
    expect(staleOutcome.effects.some(effect => effect.effect === "attempt" && effect.selected === true)).toBe(false);
    expect(await publish(staleRequest, factRefOf(staleOutcome))).toMatchObject({ answer: "refused" });
    expect((await Q.item(0)).values["certificate"]).toEqual(configured.values["certificate"]);
  } finally { life.release(); }
});

// Native policy/read/turn/grant/job interpretation is real. Git repository
// objects, callback scheduling and the checker's known test result are stands;
// no external check runner or deployed service is exercised.
test("fresh certified global checks override a stale native lane and staged publication waits for the current passed generation", { timeout: 120_000 }, async () => {
  const room = await certifiedNativeRoom(), { life, host, D, M, Q, G, nodes, pause } = room;
  try {
    expect((await G.item(0)).state).toBe("ready");
    const initialHead = host.stand.refs.get("refs/heads/main"); expect(initialHead).toMatch(/^[0-9a-f]{40}$/);
    const invitationSecret = b64url(new Uint8Array(32).fill(92)); // Public TEST seed, never operator custody.
    const invitation = await M.did(rita, "invite-member", { fields: { handle: "@sam", role: "checker", ...invitationIssueFields(ARCHIVE_CERTIFIED_RULES_COHORT.membership, invitationSecret), inviteEnds: soon(3600) } });
    await M.did(sam, "join", { fields: invitationRedemptionFields(ARCHIVE_CERTIFIED_RULES_COHORT.membership, await M.at(), invitation, sam.key, invitationSecret) });
    const checker = { membership: await M.at(), member: "@sam" };
    const configurations: Digest[] = [];
    for (const image of ["7", "8"]) {
      const value = { name: "verify", image: `sha256:${image.repeat(64)}`, environment: [], steps: [["check", "verify"]],
        judged: { passed: { status: 0, line: "ok" }, failed: { status: 1, line: "bad" } }, limits: { seconds: 60, outputBytes: 65536 } };
      const digest = valueDigest(CONFIGURATION_DOMAIN, value); configurations.push(digest);
      expect(await Q.stub.submit(await Q.intent(rita, "keep-configuration", { fields: { digest, name: "verify" } }), [], { values: [canonicalize(value)] })).toMatchObject({ answer: "accepted" });
    }
    const C0 = configurations[0]!, C1 = configurations[1]!;
    const policy = (configuration: Digest, required: boolean): RulesPolicyV11 => {
      const made = rulesPolicyProposalV11({ approvals: 0, allowZeroApprovals: true, ownerMayReview: false,
        checks: [{ name: "verify", configuration, required, checker }], labels: [], extents: [
          { name: "rules", patterns: [...RULES_PATTERNS], futurePatterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
          { name: "readme", patterns: ["README.md"], approvals: 0, allowZeroApprovals: true, approver: "change.review", checks: [], class: "content" },
          { name: "other", patterns: [], approvals: 0, allowZeroApprovals: true, approver: "change.review", checks: [], class: "content" },
        ] });
      if (!made.ok) throw Error("Strict complete test policy required"); return made.policy;
    };
    const P0 = policy(C0, false), P1 = policy(C1, true);
    await configureRules(room, P0);
    for (const definition of [changeDemo, changeDemo3]) {
      const digest = definitionDigest(definition);
      expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest, name: "change" } }), [], { values: [canonicalize(definition)] })).toMatchObject({ answer: "accepted" });
    }
    const openLane = async (definition: DeclaredDefinition, title: string) => {
      const opening = await D.stub.submit(await D.intent(rita, "open-pr", { expected: await D.expected({ repository: 0 }), fields: { definition: definitionDigest(definition), title, draft: false } }), [], { values: [canonicalize(definition)] });
      if (opening.answer !== "accepted") throw new Error(`open-pr was not accepted: ${JSON.stringify(opening)}`);
      const seq = opening.receipt.fact.seq;
      const lane = life.platform((await D.created(seq)).name); nodes.push(lane); await pause(nodes); return lane;
    };
    const L = await openLane(changeDemo, "stale native full manifest");
    const heldP0 = structuredClone((await L.summary()).value.items.find(item => item.type === "rules")!);
    expect(heldP0.values["checks"]).toEqual(expect.arrayContaining([expect.objectContaining({ name: "verify", configuration: C0, required: false })]));
    const fresh = await configureRules(room, P1);
    expect((await Q.item(0)).refs["published"]).toBeGreaterThan((heldP0.refs["source"] as FactRef).seq);
    expect((await L.summary()).value.items.find(item => item.type === "rules")).toEqual(heldP0);
    expect(P1.extents.every(extent => !extent.checks.includes("verify"))).toBe(true);
    expect((await Q.item(0)).values["certificate"]).toMatchObject({ request: fresh.request, certificate: fresh.certificate });

    // Actual native held commitment, not a fabricated source/permission flag.
    const offer = await L.did(rita, "offer", { fields: { terms: "TEST genuine held full-manifest work" } });
    await L.did(rita, "accept", { on: offer, expected: await L.expected({ on: offer }), fields: { terms: factRefOf((await L.entries())[offer]!) } });
    const hold = await L.did(rita, "take-hold", { fields: { commitment: offer } });
    const heldEntry = (await L.entries())[hold]!;
    const built = editObjects("sha1", id => {
      const object = host.stand.objects.get(id);
      return object && object.type !== "tag" ? { id, kind: object.type, body: object.data } : null;
    }, initialHead!, "source.md", utf8("# Native full manifest\n"), { scope: L.name, time: heldEntry.time, operation: factRefOf(heldEntry) });
    if (!built) throw Error("Production Git builder must build this ordinary source path");
    for (const object of built.objects) host.stand.objects.set(object.id, { id: object.id, type: object.kind, data: object.body });
    const manifest = await L.did(rita, "propose-manifest", { fields: { hold, instance: "TEST-native-full-manifest", selected: [], decisions: [],
      base: initialHead!, integration: built.commit, tree: built.tree, complete: true } });
    const frozen = await L.item(manifest); expect(frozen.values["tree"]).toBe(built.tree);
    const directMerge = async () => {
      let seq: number | null = null;
      life.setHold(envelope => envelope.from.at.scope === L.name && envelope.message.class === "request" && envelope.message.type === "tell"
        && isRecord(envelope.message.body) && envelope.message.body["message"] === "reserve");
      try {
        seq = await L.did(rita, "merge", { fields: { manifest, reports: [] } });
        const entry = (await L.entries())[seq]!, sends = entry.sends.filter(send => send.message.class === "request" && send.message.type === "tell"
          && isRecord(send.message.body) && send.message.body["message"] === "reserve");
        expect(sends).toHaveLength(1); const send = sends[0]!;
        expect(send.to).toEqual(await G.at());
        await G.stub.deliver({ from: factRefOf(entry), n: send.n, to: send.to, message: send.message });
      } finally { life.setHold(() => false); }
      await pause(nodes); if (seq === null) throw Error("Actual native merge required"); return seq;
    };
    const pushesBefore = host.stand.pushes.length;
    await directMerge();
    const missing = (await G.summary()).value.items.filter(item => item.type === "publication").at(-1)!;
    expect(missing).toMatchObject({ state: "not-reserved", values: { reason: "rules-not-met" } });
    expect(host.stand.refs.get("refs/heads/main")).toBe(initialHead); expect(host.stand.pushes).toHaveLength(pushesBefore);
    const oldJob = await L.did(rita, "request-check", { fields: { manifest, name: "verify", configuration: C0 } });
    await L.did(sam, "check", { fields: { job: oldJob, tree: built.tree, configuration: C0, outcome: "passed" } });
    expect(await L.item(oldJob)).toMatchObject({ state: "passed", values: { configuration: C0, tree: built.tree } });
    await directMerge();
    expect((await G.summary()).value.items.filter(item => item.type === "publication").at(-1))
      .toMatchObject({ state: "not-reserved", values: { reason: "rules-not-met" } });
    expect(host.stand.refs.get("refs/heads/main")).toBe(initialHead); expect(host.stand.pushes).toHaveLength(pushesBefore);
    // Refresh only after both stale-policy refusals have been witnessed.
    await L.did(rita, "ask-rules", { on: 0, expected: await L.expected({ on: 0 }) }); await pause(nodes);
    const currentJob = await L.did(rita, "request-check", { fields: { manifest, earlier: oldJob, name: "verify", configuration: C1 } });
    await L.did(sam, "check", { fields: { job: currentJob, tree: built.tree, configuration: C1, outcome: "passed" } });
    await directMerge();
    expect(host.stand.refs.get("refs/heads/main")).toBe(built.commit);
    expect((await G.summary()).value.items.filter(item => item.type === "publication").at(-1)).toMatchObject({ state: "published" });

    // A distinct genuine list lane stages first. Future tree-bound jobs
    // cannot exist until that actual stage is recorded by the destination.
    const list = await openLane(changeDemo3, "current native list generation");
    const content = "# Staged native source\n";
    const source = await list.did(rita, "propose-file", { fields: { base: built.commit, path: "list.md", digest: digestBytes(utf8(content)), size: utf8(content).length, content } });
    const file = { path: "list.md", entry: factRefOf((await list.entries())[source]!), digest: digestBytes(utf8(content)) };
    const listManifest = await list.did(rita, "propose-manifest", { fields: { base: built.commit, files: [file] } });
    expect((await list.summary()).value.items.some(item => item.type === "job")).toBe(false);
    const listMerge = await list.did(rita, "merge", { fields: { manifest: listManifest, reports: [] } }); await pause(nodes);
    const operation = factRefOf((await list.entries())[listMerge]!);
    const publication = (await G.summary()).value.items.find(item => item.type === "publication" && canonicalize(item.refs["operation"]) === canonicalize(operation));
    if (!publication) throw Error("Actual staged list publication required");
    const staged = await list.item(listManifest), stageRef = staged.values["reservationRef"];
    expect(stageRef).toMatch(/^refs\/artroom\/reservations\//); expect(staged.values["tree"]).toMatch(/^[0-9a-f]{40}$/);
    expect(host.stand.refs.get(String(stageRef))).toBe(staged.values["integration"]);
    expect(host.stand.refs.get("refs/heads/main")).toBe(built.commit);
    const openedBeforeJobs = (await G.entries()).flatMap(entry => entry.effects).filter(effect => effect.effect === "operation" && effect.for === publication.id && effect.kind === "push");
    expect(openedBeforeJobs).toEqual([]);
    const g1 = await list.did(rita, "request-check", { fields: { manifest: listManifest, name: "verify", configuration: C1 } }); await pause(nodes);
    life.setHold(envelope => envelope.from.at.scope === list.name && envelope.message.class === "request" && envelope.message.type === "tell"
      && isRecord(envelope.message.body) && envelope.message.body["message"] === "checked");
    try {
      await list.did(sam, "check", { fields: { job: g1, tree: staged.values["tree"]!, configuration: C1, outcome: "passed" } });
      await pause(nodes);
      const g2 = await list.did(rita, "request-check", { fields: { manifest: listManifest, earlier: g1, name: "verify", configuration: C1 } });
      await pause(nodes); expect((await list.item(g1)).state).toBe("superseded");
      life.setHold(() => false); await pause(nodes);
      expect(host.stand.refs.get("refs/heads/main")).toBe(built.commit);
      expect((await G.entries()).flatMap(entry => entry.effects).filter(effect => effect.effect === "operation" && effect.for === publication.id && effect.kind === "push")).toEqual([]);
      await list.did(sam, "check", { fields: { job: g2, tree: staged.values["tree"]!, configuration: C1, outcome: "passed" } }); await pause(nodes);
      expect((await G.item(publication.id)).state).toBe("published");
      expect(host.stand.refs.get("refs/heads/main")).toBe(staged.values["integration"]);
      expect(host.stand.refs.has(String(stageRef))).toBe(false);
      expect((await G.entries()).flatMap(entry => entry.effects).filter(effect => effect.effect === "operation" && effect.for === publication.id && effect.kind === "push")).toHaveLength(1);
    } finally { life.setHold(() => false); }
  } finally { life.release(); }
});
