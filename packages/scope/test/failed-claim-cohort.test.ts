import { env } from "cloudflare:test";
/** Real native scopes and production Artifacts wiring; the provider and clock are scripted. No real host outage runs. */
import { expect, test } from "vitest";
import { canonicalize, intentDigest, isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import type { Intent, PlatformDefinition, ScopeId, Seed } from "@generalbusiness/dap-contract";
import { keys } from "@generalbusiness/dap-derive/testing";
import { isCreationOffer, secretSigner, type Fetch } from "@generalbusiness/dap-client";
import { claim, checkClaim } from "../../cli/src/claim.ts";
import { memoryStore } from "../../cli/src/store.ts";
import { originalStart, startRoom } from "../../../apps/room/page/src/start-custody.ts";
import { claimStatus, type ClaimLocks, type ClaimStorage } from "../../../apps/room/page/src/claim.ts";
import { Collection } from "../../../apps/views/src/reads.ts";
import { memoryPageKeys } from "../../../apps/room/page/test/private-key-fixture.ts";
import { demoCreationRoute } from "../../../apps/room/demo-creation.ts";
import type { Binding } from "../src/namespace.ts";
import { BASE_COHORT, FAILED_CLAIM_COHORT as C } from "@generalbusiness/dap-platform";
import { artifactsOutside } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import { rita, sam, routed } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { driveFixture, effectFixture, nativeFixtureLifetime } from "./support/native-fixture-lifetime.ts";
import { soon } from "./net.ts";

const { paul } = keys;
const HOST = "failed-claim.invalid", NAMESPACE = "failed-claim-cohort";
const fixture = () => nativeFixtureLifetime(beginSessionFixture({ secret: null, sessions: false, inspector: null }), { required: false });
type Life = ReturnType<typeof fixture>;
type Node = ReturnType<Life["platform"]>;

async function installed(life: Life, policy: "keys" | "open" = "keys", pin: PlatformDefinition = C.register) {
  const control = { bound: true, failed: true, creates: 0, deleted: [] as string[], reads: [] as { scope: string; seconds: number }[] };
  const ns: ArtifactsNamespace = {
    create: async name => {
      control.creates++;
      if (control.failed) throw new TypeError("Scripted provider outage");
      return { name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git`, token: "test-creation-plaintext" } as never;
    },
    delete: async name => { control.deleted.push(name); return true; },
    get: async name => ({
      createToken: async (scope: string, seconds: number) => { control.reads.push({ scope, seconds }); return { id: "test-token", plaintext: "test-read-plaintext", scope, expiresAt: soon(seconds) }; },
      revokeToken: async () => true,
      info: async () => ({ name, remote: `https://${HOST}/git/${NAMESPACE}/${name}.git` }),
    }) as never,
  };
  const intent: Intent = { v: 1, to: null, actor: paul.key, kind: "install", on: null, expected: {},
    fields: { host: "artifacts", namespace: NAMESPACE, policy, ...(policy === "keys" ? { founders: [rita.key] } : {}) }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
  const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: pin, creator: null, cause: intentDigest(intent), ordinal: 0 }));
  life.outside(R.name, (given, sql) => artifactsOutside(given, sql, {
    ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
    ARTIFACTS_NAMESPACE: NAMESPACE, ...(control.bound ? { ARTIFACTS: ns } : {}),
  }));
  expect(await life.wait(() => R.stub.create(signIntent(intent, paul.secret), pin))).toMatchObject({ answer: "accepted" });
  return { R, control, ns };
}
const found = (life: Life, R: Node) => life.wait(() => R.act(rita, "found", {
  expected: { register: 1 }, idempotencyKey: crypto.randomUUID(), fields: { branch: "main", founderHandle: "@founder", recoveryKey: sam.key },
}));
async function exhaust(life: Life, R: Node) {
  await effectFixture([R], life.wait);
  life.advance(1_000); await effectFixture([R], life.wait);
  life.advance(2_000); await effectFixture([R], life.wait);
}

// Invariant: terminal failed claims release the actual64-place item capacity without changing historical registers.
// CF-1: Register 28 of the base family carries the same repair.
test.each([C.register, BASE_COHORT.register] as const)("failed claims release all64 places, and the returning host can serve a new claim (%s)", async pin => {
  const life = fixture();
  try {
    const { R, control } = await installed(life, "keys", pin);
    for (let n = 0; n < 65; n++) {
      const answer = await found(life, R);
      expect(answer.answer, `claim ${n}`).toBe("accepted");
      if (answer.answer !== "accepted") throw Error("Expected an accepted claim");
      await exhaust(life, R);
      const summary = (await life.wait(() => R.summary())).value;
      // Summary lists live items only; its state counts include final failed claims.
      expect(summary.counts).toContainEqual(["claim", "failed", n + 1]);
      expect(summary.counts).toContainEqual(["claim", "pending", 0]);
    }
    expect(control.creates).toBe(65 * 3);
    control.failed = false;
    const recovered = await found(life, R);
    expect(recovered.answer).toBe("accepted");
    if (recovered.answer !== "accepted") throw Error("Expected recovery claim");
    await effectFixture([R], life.wait);
    const summary = (await life.wait(() => R.summary())).value;
    expect(summary.items.find(item => item.id === recovered.receipt.fact.seq)?.values["repository"]).toBeTruthy();
    expect(summary.counts).toContainEqual(["claim", "failed", 65]);
    expect(control.creates).toBe(65 * 3 + 1);
  } finally { life.release(); }
});

// Invariant: absent wiring consumes no provider attempt and cannot turn an accepted claim into final failure.
test("an unwired host leaves the claim pending after an hour and resumes when its binding returns", async () => {
  const life = fixture();
  try {
    const { R, control } = await installed(life);
    control.bound = false;
    await life.wait(() => R.restart());
    const accepted = await found(life, R);
    expect(accepted.answer).toBe("accepted");
    if (accepted.answer !== "accepted") throw Error("Expected an accepted claim");
    await exhaust(life, R);
    life.advance(3_600_000);
    await effectFixture([R], life.wait);
    expect(control.creates).toBe(0);
    const waiting = (await life.wait(() => R.summary())).value;
    expect(waiting.counts).toContainEqual(["claim", "pending", 1]);
    expect(waiting.counts).toContainEqual(["claim", "failed", 0]);
    control.bound = true; control.failed = false;
    await life.wait(() => R.restart());
    await effectFixture([R], life.wait);
    expect(control.creates).toBe(1);
    const resumed = (await life.wait(() => R.summary())).value;
    expect(resumed.counts).toContainEqual(["claim", "failed", 0]);
    expect(resumed.items.find(item => item.id === accepted.receipt.fact.seq)?.values["repository"]).toBeTruthy();
  } finally { life.release(); }
});

// Invariant: the new native act supplies no hours field and the real adapter asks the provider for3600seconds.
test("the new cohort refuses caller hours and mints a one-hour read token", async () => {
  const life = fixture();
  try {
    const { R, control, ns } = await installed(life);
    control.failed = false;
    expect((await found(life, R)).answer).toBe("accepted");
    await effectFixture([R], life.wait);
    const creation = (await life.wait(() => R.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "directory");
    if (!creation || !isSeed(creation.to)) throw Error("Expected native directory creation");
    const D = life.platform(scopeIdOf(creation.to));
    await driveFixture([R, D], life.wait);
    const seeds = (await life.wait(() => D.entries()))[0]!.sends.map(send => send.to).filter(isSeed) as Seed[];
    const nodes = seeds.map(seed => life.platform(scopeIdOf(seed)));
    const member = nodes[seeds.findIndex(seed => seed.kind === "membership")]!;
    const destination = nodes[seeds.findIndex(seed => seed.kind === "destination")]!;
    await driveFixture([R, D, ...nodes], life.wait);
    const seat = await life.wait(() => member.did(rita, "seat", { expected: { roster: 1 } }));
    const expected = await life.wait(() => member.expected({ roster: 0, member: seat }));
    await life.wait(() => member.did(rita, "first-key", { fields: { member: seat }, expected }));
    life.outside(destination.name, (given, sql) => {
      const port = artifactsOutside(given, sql, {
        ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
        ARTIFACTS_NAMESPACE: NAMESPACE, ARTIFACTS: ns,
      });
      // First-head and publication work remain recorded but unsent in this token fixture.
      return { ...port, accepts: (owner, kind) => kind === "mint-read" && port.accepts(owner, kind) };
    });
    await life.wait(() => destination.restart());
    const before = (await life.wait(() => destination.summary())).value;
    const branch = before.items.find(item => item.type === "branch")!;
    const refused = await life.wait(() => destination.act(rita, "read-token", { on: branch.id, expected: { on: branch.revision }, fields: { hours: 24 } }));
    expect(refused).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect(control.reads).toEqual([]);
    const accepted = await life.wait(() => destination.act(rita, "read-token", { on: branch.id, expected: { on: branch.revision }, fields: {} }));
    expect(accepted.answer).toBe("accepted");
    await effectFixture([destination], life.wait);
    expect(control.reads).toEqual([{ scope: "read", seconds: 3600 }]);
  } finally { life.release(); }
});

async function clientSurface(life: Life, R: Node) {
  const service = "https://scopes.test", register = await life.wait(() => R.at());
  const counters = { acts: 0, queries: 0 };
  const fetch: Fetch = (url, init) => {
    const path = new URL(url).pathname;
    if (init?.method === "POST" && path.endsWith("/acts")) counters.acts++;
    if (path.endsWith("/query-items")) counters.queries++;
    return life.wait(() => routed(url, init));
  };
  const creationOffer = async () => life.wait(async () => {
    const response = await demoCreationRoute(new Request(service + "/v1/demo/creation-offer"), {
      SCOPES: env.PLATFORM as unknown as Binding, DEPLOYMENT: "TEST failed claim cohort", PUBLIC_ORIGIN: service,
      ARTIFACTS_NAMESPACE: NAMESPACE,
      ARTIFACTS_CONFIG: canonicalize({ registerScope: R.name, namespace: NAMESPACE, host: HOST, maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
      DEMO_START_CONFIG: canonicalize({ v: 3, origin: service, deployment: "TEST failed claim cohort", register, definition: C.register }),
    });
    expect(response.status).toBe(200);
    const offer: unknown = await response.json();
    if (!isCreationOffer(offer, service, register)) throw Error("Expected exact new-cohort offer");
    return offer;
  });
  const pause = async (waiting: readonly ScopeId[]) => {
    life.advance(1_000);
    await driveFixture([R, ...waiting.filter(scope => scope !== R.name).map(scope => life.platform(scope))], life.wait);
  };
  return { service, register, counters, fetch, now: life.now, tries: 5, pause, creationOffer };
 }

function locksOf(): ClaimLocks {
  const queues = new Map<string, Promise<unknown>>();
  return { request: async (name, run) => {
    const prior = queues.get(name) ?? Promise.resolve();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    queues.set(name, prior.then(() => held));
    await prior;
    try { return await run(); } finally { release(); }
  } };
}

// Invariant: an exact final-failure observation survives the read window without resubmission; --again starts a distinct claim.
test("dap create reports a final failure, retains it past an hour, and can start a new room", async () => {
  const life = fixture();
  try {
    const { R, control } = await installed(life, "open");
    const { service, register, counters, ...client } = await clientSurface(life, R);
    const store = memoryStore();
    await store.keep("visitor", rita.secret);
    await store.save({ v: 2, service, key: "visitor", register });
    const ctx = { store, ...client };
    const pending = await life.wait(() => claim({ ...ctx, tries: 1, pause: async () => {} }, "retry-room"));
    expect(pending.code).toBe(1);
    expect(pending.claimState).toBeUndefined();
    const retained = (await store.config())!;
    const found = retained.claim!["found"]!.accepted!;
    await store.save({ ...retained, claim: { ...retained.claim!, failure: { found, observed: found } } });
    const beforeHintCheck = counters.acts, beforeHintCreates = control.creates;
    const unverifiedHint = await life.wait(() => checkClaim(ctx, "retry-room"));
    expect(unverifiedHint.claimState).toBeUndefined();
    expect(counters.acts).toBe(beforeHintCheck);
    expect(control.creates).toBe(beforeHintCreates);
    const failed = await life.wait(() => claim(ctx, "retry-room"));
    expect(failed, failed.lines.join("\n")).toMatchObject({ code: 1, claimState: "failed" });
    expect(failed.lines.join(" ")).toContain("freed its place");
    const original = (await store.config())!.claim!;
    expect(original.failure).toBeDefined();
    expect(control.creates).toBe(3);
    expect(counters.queries).toBe(0);
    const savedActs = counters.acts, savedQueries = counters.queries;
    life.advance(3_600_001);
    const checked = await life.wait(() => checkClaim(ctx, "retry-room"));
    expect(checked).toMatchObject({ code: 1, claimState: "failed" });
    expect([counters.acts, counters.queries]).toEqual([savedActs, savedQueries]);
    expect((await store.config())!.claim!.intent).toBe(original.intent);
    control.failed = false;
    const recovered = await life.wait(() => claim(ctx, "retry-room", { again: true }));
    expect(recovered, recovered.lines.join("\n")).toMatchObject({ code: 0 });
    const configured = (await store.config())!;
    expect(configured.repository?.directory).toBeDefined();
    const collection = new Collection({ service, signer: secretSigner((await store.secret(configured.key))!), config: async () => configured, fetch: client.fetch, now: life.now });
    await life.wait(() => collection.begin());
    expect([collection.membership, collection.directory]).toEqual([configured.repository!.membership, configured.repository!.directory]);
    expect(collection.frames.get(collection.membership.scope)!.summary.definition).toBe(C.membership);
    expect(collection.frames.get(collection.directory.scope)!.summary.definition).toBe(C.directory);
    collection.close();
  } finally { life.release(); }
});


// Real Page/CLI/native workflow. WebCrypto is real; private storage, lock serialization, provider and clock are stand-ins.
test("Page Start rejects a forged failed hint, then keeps its creator key and original proof through a real failure and retry", async () => {
  const life = fixture();
  try {
    const { R, control } = await installed(life, "open");
    const { service, register, counters, ...client } = await clientSurface(life, R);
    const values = new Map<string, string>();
    const storage: ClaimStorage = { getItem: key => values.get(key) ?? null, setItem: (key, bytes) => { values.set(key, bytes); } };
    const keys = memoryPageKeys(), locks = locksOf();
    const options = { ...client, keys, locks };
    const offer = await client.creationOffer();
    const first = await life.wait(() => startRoom(service, storage, { ...options, mode: "new", offer, label: "Page retry", tries: 1, pause: async () => {} }));
    expect(first.pending).toBe(true);
    const originalOperation = first.operation, creator = first.key;
    const journalKey = [...values.keys()].find(key => key.startsWith("dap-page-claim-2:"))!;
    const journal = JSON.parse(values.get(journalKey)!) as { claims: Record<string, string> };
    const kept = JSON.parse(journal.claims[originalOperation]!) as { config: { claim: { found: { accepted: unknown }; failure?: unknown } } };
    kept.config.claim.failure = { found: kept.config.claim.found.accepted, observed: kept.config.claim.found.accepted };
    journal.claims[originalOperation] = JSON.stringify(kept);
    values.set(journalKey, JSON.stringify(journal));
    const before = counters.acts;
    const blocked = await life.wait(() => startRoom(service, storage, { ...options, mode: "new", offer, label: "Must wait" }));
    expect(blocked.pending).toBe(true);
    expect(blocked.outcome.claimState).toBeUndefined();
    expect(counters.acts).toBe(before);
    expect(originalStart(service, storage)?.operation).toBe(originalOperation);
    expect(originalStart(service, storage)?.key).toBe(creator);
    const failed = await life.wait(() => startRoom(service, storage, { ...options, mode: "continue" }));
    expect(failed.outcome.claimState).toBe("failed");
    expect(failed.pending).toBe(false);
    expect(originalStart(service, storage)?.state).toBe("failed");
    // A genuine current offer for another register cannot retarget retained Start custody.
    const { R: otherRegister } = await installed(life, "open");
    const otherClient = await clientSurface(life, otherRegister);
    const otherOffer = await otherClient.creationOffer();
    const beforeRetarget = [...values], callsBeforeRetarget = counters.acts;
    expect(otherOffer.register).not.toEqual(register);
    await expect(life.wait(() => startRoom(service, storage, { ...options, mode: "new", offer: otherOffer, label: "Must keep original register" })))
      .rejects.toThrow("The configured register changed");
    expect([...values]).toEqual(beforeRetarget);
    expect(counters.acts).toBe(callsBeforeRetarget);
    expect(originalStart(service, storage)).toMatchObject({ key: creator, operation: originalOperation, state: "failed", configured: { register } });
    control.failed = false;
    const retryOffer = await client.creationOffer();
    const recovered = await life.wait(() => startRoom(service, storage, { ...options, mode: "new", offer: retryOffer, label: "New Page room" }));
    expect(recovered.outcome, recovered.outcome.lines.join("\n")).toMatchObject({ code: 0 });
    expect(recovered.key).toBe(creator);
    expect(recovered.operation).not.toBe(originalOperation);
    expect(recovered.repository).not.toBeNull();
    expect(claimStatus({ service, publicKey: creator }, { register, definition: C.register }, storage, originalOperation)?.state).toBe("failed");
  } finally { life.release(); }
});


// Invariant: historical registers keep their pending claims and original settlement reply.
test("Register18 retains failed attempts as pending and exposes no new claim projection", async () => {
  const life = fixture();
  try {
    const { R } = await installed(life, "keys", "platform:register@18");
    const accepted = await found(life, R);
    expect(accepted.answer).toBe("accepted");
    await exhaust(life, R);
    const entry = (await life.wait(() => R.entries())).find(row => row.input.type === "act" && row.input.signed.intent.kind === "found")!;
    if (entry.input.type !== "act") throw Error("Expected original found");
    const original = entry.input.signed;
    const settled = await life.wait(() => R.stub.settle(original));
    expect(settled).toMatchObject({ ok: true, value: { definition: "platform:register@18" } });
    expect(Object.hasOwn(settled, "claim")).toBe(false);
    expect((await life.wait(() => R.summary())).value.counts).toContainEqual(["claim", "pending", 1]);
  } finally { life.release(); }
});
