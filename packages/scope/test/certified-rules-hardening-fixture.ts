import { expect } from "vitest";
import type { Digest, Entry, FactRef, Intent, Item, Read, ScopeRef, Sealed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, factRefOf, intentDigest, isDigest, isRecord, isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { HARDENED_CERTIFIED_RULES_COHORT, RULES_CERTIFICATE_KIND, RULES_TREE_PROOF, rulesPolicyProposalV11, type RulesPolicyV11 } from "@generalbusiness/dap-platform";
import type { EffectAnswer } from "../src/operations.ts";
import { DestinationHost, type DestinationProvider } from "../src/destination-host.ts";
import { CredentialStore } from "../src/credential-store.ts";
import { readRulesTree } from "../src/rules-tree-provider.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, sam } from "./repository.ts";
import { reader, driveFixture, nativeFixtureLifetime } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";

/** A gate owned, released and joined by its one native witness. */
export interface CertificateHold { entered(): void; release: Promise<void> }
export function certificateGate() {
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  const released = new Promise<void>(resolve => { release = resolve; });
  return { entered, release, hold: { entered: enter, release: released } satisfies CertificateHold };
}

// Hardened-family fixture only. Native rules, grants, stores and reads are real.
// Git objects, clock and bounded callback scheduling are TEST stands; no live
// provider HTTP, checker runner or deployment is exercised.
export async function hardeningNativeRoom() {
  const cohort = HARDENED_CERTIFIED_RULES_COHORT;
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false }), host = ownHost();
  const providerCalls: { commit: string; maxCanonicalBytes: number }[] = [];
  const control: {
    heldBeforeSend: CertificateHold | null;
    heldRead: CertificateHold | null;
    heldAnswer: CertificateHold | null;
    answers: (EffectAnswer | null)[];
  } = { heldBeforeSend: null, heldRead: null, heldAnswer: null, answers: [] };
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
      return { ...actual, send: async request => {
        if (request.kind !== RULES_CERTIFICATE_KIND || !actual.accepts(request.owner, request.kind)) return actual.send(request);
        const before = control.heldBeforeSend;
        if (before) { before.entered(); await before.release; }
        const answer = await certificate.send(request);
        control.answers.push(answer);
        // Return this exact host-produced answer after the real intervening
        // entry. Neither its evidence nor its retained proof is replaced.
        const after = control.heldAnswer;
        if (after) { after.entered(); await after.release; }
        return answer;
      } };
    });
    await G.restart(); await pause(nodes);
    const seat = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    return { life, host, providerCalls, control, pause, R, D, M, Q, G, nodes, bindings };
  } catch (error) { life.release(); throw error; }
}
export type HardeningRoom = Awaited<ReturnType<typeof hardeningNativeRoom>>;

export async function openHardeningCertificate(room: HardeningRoom, policy: RulesPolicyV11): Promise<FactRef> {
  const proposal = rulesPolicyProposalV11(policy);
  if (!proposal.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  const signed = await G.intent(rita, RULES_CERTIFICATE_KIND, { on: 0, expected: await G.expected({ on: 0 }), fields: {
    proposal: proposal.digest, directoryBirth: factRefOf((await D.entries())[0]!),
    rulesBirth: factRefOf((await Q.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!),
  } });
  const answer = await G.stub.submit(signed, [], { values: [canonicalize(proposal.policy)] });
  expect(answer, canonicalize(answer)).toMatchObject({ answer: "accepted" });
  if (answer.answer !== "accepted") throw Error("Actual certificate opening required");
  return answer.receipt.fact;
}
export async function publishHardeningCertificate(room: HardeningRoom, policy: RulesPolicyV11, request: FactRef, certificate: FactRef, proof: Digest, proofBytes: string) {
  const proposed = rulesPolicyProposalV11(policy);
  if (!proposed.ok) throw Error("Strict policy required");
  const { D, M, Q, G } = room;
  return Q.stub.submit(await Q.intent(rita, "publish", { on: 0, expected: await Q.expected({ on: 0 }),
    fields: JSON.parse(canonicalize({ ...proposed.policy, proposal: proposed.digest, proof, certificateRequest: request, certificate,
      directoryBirth: factRefOf((await D.entries())[0]!), destinationBirth: factRefOf((await G.entries())[0]!), membershipBirth: factRefOf((await M.entries())[0]!) })) }), [],
    { values: [canonicalize(proposed.policy), proofBytes] });
}
export async function configureHardeningRules(room: HardeningRoom, policy: RulesPolicyV11) {
  const request = await openHardeningCertificate(room, policy); await room.pause(room.nodes);
  const outcome = (await hardeningEntries(room.G)).find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
  if (!outcome || outcome.input.type !== "outcome" || outcome.input.result !== "confirmed"
    || !outcome.effects.some(effect => effect.effect === "attempt" && effect.selected === true)) throw Error("Actual selected native certificate required");
  const body = outcome.input.evidence.body;
  if (!isRecord(body) || !isDigest(body["proof"])) throw Error("Actual proof digest required");
  const kept = await room.G.stub.retained(reader, "value", body["proof"], RULES_TREE_PROOF.domain);
  if (!kept.ok) throw Error("Actual retained proof required");
  const certificate = factRefOf(outcome);
  expect(await publishHardeningCertificate(room, policy, request, certificate, body["proof"], kept.value.bytes)).toMatchObject({ answer: "accepted" });
  return { request, certificate, proof: body["proof"], proofBytes: kept.value.bytes };
}

/** Read every real native page; the 32-proof witness may exceed one MiB. */
export async function hardeningSealed(node: Platform): Promise<readonly Sealed[]> {
  const rows: Sealed[] = [];
  let cursor: string | undefined, head: { seq: number; hash: Digest } | null = null;
  for (let page = 0; page < 64; page++) {
    const read = await node.stub.history(reader, cursor);
    if (!read.ok) return expect.fail(`Complete native history unavailable: ${read.reason}`);
    if (head === null) head = read.at;
    expect(read.at, "The paused fixture's history pages keep one head").toEqual(head);
    rows.push(...read.value);
    if (read.complete) {
      expect(rows.map(row => row.entry.seq), "No native prefix may be omitted").toEqual(Array.from({ length: head.seq + 1 }, (_, seq) => seq));
      return rows;
    }
    if (read.next === undefined || read.next === cursor) return expect.fail("Incomplete history needs a new native cursor");
    cursor = read.next;
  }
  return expect.fail("Native witness history exceeds its 64-page allowance");
}
export async function hardeningEntries(node: Platform): Promise<readonly Entry[]> {
  return (await hardeningSealed(node)).map(row => row.entry);
}
export async function hardeningItems(node: Platform, type: string): Promise<readonly Item[]> {
  const rows: Item[] = []; let cursor: string | undefined;
  const stub = node.stub as unknown as { items(reader: unknown, type: string, cursor?: string): Promise<Read<readonly Item[]>> };
  for (let page = 0; page < 8; page++) {
    const read = await stub.items(reader, type, cursor);
    if (!read.ok) return expect.fail(`Native retained items unavailable: ${read.reason}`);
    rows.push(...read.value);
    if (read.complete) return rows;
    if (read.next === undefined || read.next === cursor) return expect.fail("Incomplete items need a new native cursor");
    cursor = read.next;
  }
  return expect.fail("Native retained items exceed the eight-page allowance");
}
export async function hardeningCertificate(room: HardeningRoom, policy: RulesPolicyV11) {
  const request = await openHardeningCertificate(room, policy);
  await room.pause(room.nodes);
  const outcome = (await hardeningEntries(room.G)).find(entry => entry.input.type === "outcome" && entry.input.operation === `${request.seq}:0`);
  if (!outcome || outcome.input.type !== "outcome") return expect.fail("Actual native certificate outcome required");
  expect(outcome.input).toMatchObject({ result: "confirmed", kind: RULES_CERTIFICATE_KIND });
  expect(outcome.effects).toEqual(expect.arrayContaining([expect.objectContaining({ effect: "attempt", operation: `${request.seq}:0`, selected: true })]));
  const body = outcome.input.evidence.body;
  if (!isRecord(body) || !isDigest(body["proof"])) return expect.fail("Selected native certificate must name its proof");
  const kept = await room.G.stub.retained(reader, "value", body["proof"], RULES_TREE_PROOF.domain);
  if (!kept.ok) return expect.fail("Selected native proof must be retained");
  return { request, certificate: factRefOf(outcome), proof: body["proof"], proofBytes: kept.value.bytes, outcome };
}
