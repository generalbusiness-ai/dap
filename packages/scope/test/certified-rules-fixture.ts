import { expect } from "vitest";
import type { Digest, FactRef, Intent, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, factRefOf, intentDigest, isDigest, isRecord, isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, RULES_TREE_PROOF, rulesPolicyProposalV11, type RulesPolicyV11 } from "@generalbusiness/dap-platform";
import { DestinationHost, type DestinationProvider } from "../src/destination-host.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { readRulesTree } from "../src/rules-tree-provider.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, sam } from "./repository.ts";
import { reader, driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { platformDeliveryObservers } from "./worker.ts";

// New-family fixtures only: no historical fixture or production authority changes.
export async function certifiedNativeRoom() {
  const cohort = ARCHIVE_CERTIFIED_RULES_COHORT;
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false }), host = ownHost();
  const providerCalls: { commit: string; maxCanonicalBytes: number }[] = [];
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
    const destinationBirthRows: { answer: string; reason: string | null; name: string | null }[] = [];
    let destinationBirthOverflow = false;
    const observedWord = (value: unknown, allowed: readonly string[]) => typeof value === "string" && allowed.includes(value)
      ? value : value === undefined || value === null ? null : "outside-closed-set";
    const observeDestinationBirth: NonNullable<ReturnType<typeof platformDeliveryObservers.get>> = (envelope, answer) => {
      if (platformDeliveryObservers.get(D.name) !== observeDestinationBirth || envelope.from.at.scope !== D.name
        || !isSeed(envelope.to) || envelope.to.kind !== "destination" || envelope.to.definition !== cohort.destination
        || canonicalize(envelope.to.creator) !== canonicalize(envelope.from.at)
        || envelope.message.class !== "request" || envelope.message.type !== "create") return;
      if (destinationBirthRows.length >= 16) { destinationBirthOverflow = true; return; }
      destinationBirthRows.push({ answer: answer === "rejected" ? "rejected" : answer === null ? "no-answer"
        : observedWord(answer.answer, ["recorded", "retry", "routing", "source-unverified"]) ?? "outside-closed-set",
        reason: observedWord(answer !== null && typeof answer === "object" && "reason" in answer ? answer.reason : undefined,
          ["dependency-unavailable", "busy", "clock-behind", "scope-provisional", "guard-incomplete", "authority-unavailable", "unavailable", "rate-limited", "scope-full", "unsupported-definition", "wrong-incarnation", "not-found"]),
        name: observedWord(answer !== null && typeof answer === "object" && "name" in answer ? answer.name : undefined,
          ["scopeEntries", "scopeBytes", "scopeItems", "scopeRecords", "scopeRequests"]) });
    };
    if (platformDeliveryObservers.has(D.name)) throw Error("TEST destination birth observer already owned");
    platformDeliveryObservers.set(D.name, observeDestinationBirth);
    life.cleanup(() => { if (platformDeliveryObservers.get(D.name) === observeDestinationBirth) platformDeliveryObservers.delete(D.name); destinationBirthRows.length = 0; });
    const destinationBirthObservation = () => { life.active(); return { complete: !destinationBirthOverflow, rows: destinationBirthRows.map(row => ({ ...row })) }; };
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
    return { life, host, providerCalls, control, pause, R, D, M, Q, G, nodes, bindings, destinationBirthObservation };
  } catch (error) { life.release(); throw error; }
}
export type CertifiedRoom = Awaited<ReturnType<typeof certifiedNativeRoom>>;

export async function openRulesCertificate(room: CertifiedRoom, policy: RulesPolicyV11): Promise<FactRef> {
  const proposal = rulesPolicyProposalV11(policy);
  if (!proposal.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  const signed = await G.intent(rita, RULES_CERTIFICATE_KIND, { on: 0, expected: await G.expected({ on: 0 }), fields: {
    proposal: proposal.digest, directoryBirth: factRefOf((await D.entries())[0]!),
    rulesBirth: factRefOf((await Q.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!),
  } });
  const answer = await G.stub.submit(signed, [], { values: [canonicalize(proposal.policy)] });
  expect(answer).toMatchObject({ answer: "accepted" });
  if (answer.answer !== "accepted") throw Error("Actual certificate opening required");
  return factRefOf((await G.entries())[answer.receipt.fact.seq]!);
}
export async function publishRulesCertificate(room: CertifiedRoom, policy: RulesPolicyV11, request: FactRef, certificate: FactRef, proof: Digest, proofBytes: string) {
  const proposed = rulesPolicyProposalV11(policy);
  if (!proposed.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  return Q.stub.submit(await Q.intent(rita, "publish", { on: 0, expected: await Q.expected({ on: 0 }),
    fields: JSON.parse(canonicalize({ ...proposed.policy, proposal: proposed.digest, proof, certificateRequest: request, certificate,
      directoryBirth: factRefOf((await D.entries())[0]!), destinationBirth: factRefOf((await G.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!) })) }), [],
    { values: [canonicalize(proposed.policy), proofBytes] });
}
export async function configureRules(room: CertifiedRoom, policy: RulesPolicyV11) {
  const request = await openRulesCertificate(room, policy); await room.pause(room.nodes);
  const outcome = (await room.G.entries()).find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
  if (!outcome || outcome.input.type !== "outcome" || outcome.input.result !== "confirmed"
    || !outcome.effects.some(effect => effect.effect === "attempt" && effect.selected === true)) throw Error("Actual selected native certificate required");
  const body = outcome.input.evidence.body;
  if (!isRecord(body) || !isDigest(body["proof"])) throw Error("Actual proof digest required");
  const kept = await room.G.stub.retained(reader, "value", body["proof"], RULES_TREE_PROOF.domain);
  if (!kept.ok) throw Error("Actual retained proof required");
  const certificate = factRefOf(outcome);
  expect(await publishRulesCertificate(room, policy, request, certificate, body["proof"], kept.value.bytes)).toMatchObject({ answer: "accepted" });
  return { request, certificate, proof: body["proof"] };
}

