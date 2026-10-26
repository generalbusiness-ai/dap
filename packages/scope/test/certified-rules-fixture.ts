import { expect } from "vitest";
import { PROPOSED_BOUNDS, type Digest, type FactRef, type Intent, type ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, factRefOf, intentDigest, isDigest, isFieldValue, isRecord, isSeed, parseStrict, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { ARCHIVE_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, RULES_POLICY_VALUE_V11, RULES_TREE_PROOF, platform, rulesPolicyProposalV11, type RulesPolicyV11 } from "@generalbusiness/dap-platform";
import { placesOf, readFields, valueDigest } from "@generalbusiness/dap-derive";
import { DestinationHost, type DestinationProvider } from "../src/destination-host.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { readRulesTree } from "../src/rules-tree-provider.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, sam } from "./repository.ts";
import { reader, driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";

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
    return { life, host, providerCalls, control, pause, R, D, M, Q, G, nodes, bindings };
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
  const signed = await Q.intent(rita, "publish", { on: 0, expected: await Q.expected({ on: 0 }),
    fields: JSON.parse(canonicalize({ ...proposed.policy, proposal: proposed.digest, proof, certificateRequest: request, certificate,
      directoryBirth: factRefOf((await D.entries())[0]!), destinationBirth: factRefOf((await G.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!) })) });
  const values = [canonicalize(proposed.policy), proofBytes];
  const answer = await Q.stub.submit(signed, [], { values });
  if (answer.answer === "refused" && answer.reason === "bad-field") {
    // Snapshot only after the actual refused submit. Do not print fields or values.
    const publish = platform(ARCHIVE_CERTIFIED_RULES_COHORT.rules)?.data.acts["publish"];
    // readFields defers native code marks to the subsequent rule check.
    const fields = publish ? readFields(publish.fields as Parameters<typeof readFields>[0], signed.intent.fields, PROPOSED_BOUNDS) : null;
    const places = publish ? placesOf(publish.fields, signed.intent.fields) : [];
    const namedValues = (["proposal", "proof"] as const).map(field => {
      const declared = field === "proposal" ? RULES_POLICY_VALUE_V11 : RULES_TREE_PROOF;
      const place = places.find(row => row.field === field), digest = signed.intent.fields[field];
      return { field, placePresent: place !== undefined, domainMatches: place?.domain === declared.domain,
        boundMatches: place?.max === declared.max, fieldIsDigest: isDigest(digest), supplied: values.map(bytes => {
          const withinLimit = bytes.length <= declared.max && utf8(bytes).length <= declared.max;
          if (!withinLimit) return { withinLimit, parsed: false, canonical: false, digestMatches: false };
          try {
            const value = parseStrict(bytes);
            return { withinLimit, parsed: true, canonical: canonicalize(value) === bytes,
              digestMatches: isDigest(digest) && valueDigest(declared.domain, value) === digest };
          } catch { return { withinLimit, parsed: false, canonical: false, digestMatches: false }; }
        }) };
    });
    const extents = signed.intent.fields["extents"];
    let extentsCanonicalBytes: number | null = null;
    try { extentsCanonicalBytes = utf8(canonicalize(extents)).length; } catch { /* No value/body or exception text. */ }
    const diagnostic = canonicalize({ answer: { answer: answer.answer, reason: answer.reason,
      ...(answer.name === undefined ? {} : { name: answer.name.slice(0, 256) }), judgedAt: answer.judgedAt },
      readFields: fields === null ? { assessed: false } : fields.ok ? { assessed: true, ok: true }
        : { assessed: true, ok: false, detail: fields.detail.slice(0, 256) },
      suppliedValueCount: values.length, namedValues, codedExtents: { fieldValue: isFieldValue(extents),
        array: Array.isArray(extents), count: Array.isArray(extents) ? extents.length : null,
        canonicalUtf8Bytes: extentsCanonicalBytes } });
    if (utf8(diagnostic).length > 4096) throw Error("TEST Q11 publish admission diagnostic exceeded 4096 bytes");
    throw Error(`TEST Q11 publish admission AFTER refused submit: ${diagnostic}`);
  }
  return answer;
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

