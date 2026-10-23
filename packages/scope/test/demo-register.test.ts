/** Real Register17 judgments, creator lineage, Directory16 genesis and SQLite
 * index. Git provisioning, clock and scheduling are TEST
 * stand-ins; this is not hosted deployment or provider acceptance. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, OperationId } from "@generalbusiness/dap-contract";
import { factRefOf, intentDigest, isSeed, scopeIdOf, seedDigest, signIntent } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, DEMO_PURPOSE, DEMO_REGISTER, WEB_DEMO_REGISTER, DIRECTORY_OF, repositoryName } from "@generalbusiness/dap-platform";
import { api } from "../src/worker.ts";
import { indexedScopes, scopeIndex } from "../src/scope-index.ts";
import { namespace } from "../src/namespace.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { nativeFixtureLifetime, effectFixture } from "./support/native-fixture-lifetime.ts";
import { rita, sam, una } from "./repository.ts";
import { outsideOf } from "./outside.ts";
import type { Binding } from "../src/namespace.ts";
import type { PlatformScope } from "./worker.ts";
import { soon } from "./net.ts";

test("an outside founder needs open policy and its actual child is indexed at genesis through enforced lineage", async () => {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: "TEST demo register sessions", sessions: false, inspector: null }), { required: false });
  try {
    for (const policy of ["keys", "open"] as const) {
      const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
        fields: { host: "git.example", namespace: "demo-policy", policy, founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
      const pin = ARCHIVE_DEVICE_APPLICATION_COHORT.register;
      expect(pin).toBe("platform:register@17");
      const name = scopeIdOf({ v: 1, kind: "register", definition: pin, creator: null, cause: intentDigest(install), ordinal: 0 });
      const settings = { SCOPE_INDEX: env.SCOPE_INDEX, SCOPE_INDEX_MODE: "enforce", DEPLOYMENT: "TEST-dap-demo",
        ARTIFACTS_CONFIG: JSON.stringify({ registerScope: name, namespace: "demo-policy", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" }) };
      const index = scopeIndex(settings)!;
      const R = life.platform(name), host = outsideOf(name); life.wire(name, () => ({ outside: host }));
      const scopes = api(indexedScopes(env.PLATFORM, settings), null, settings);
      expect(await life.wait(() => scopes.create(signIntent(install, rita.secret), pin))).toMatchObject({ answer: "accepted" });
      expect(await index.has(name, "register")).toBe(true);
      expect(sam.key).not.toBe(rita.key);
      const found = await life.wait(() => R.intent(sam, "found", { expected: { register: 1 }, fields: { branch: "main", founderHandle: "@visitor", recoveryKey: una.key } }));
      const directorySeed = { v: 1 as const, kind: "directory" as const, definition: ARCHIVE_DEVICE_APPLICATION_COHORT.directory,
        creator: await life.wait(() => R.at()), cause: intentDigest(found.intent), ordinal: 0 };
      const D = life.platform(scopeIdOf(directorySeed));
      if (policy === "keys") {
        expect(await life.wait(() => R.stub.submit(found, []))).toMatchObject({ answer: "refused", reason: "unauthorized" });
        expect(await index.has(D.name)).toBe(false);
        continue;
      }
      host.answer("1:0" as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(seedDigest(directorySeed), 1), id: "TEST-demo-repository" } } });
      expect(await life.wait(() => R.stub.submit(found, []))).toMatchObject({ answer: "accepted" });
      await effectFixture([R], life.wait);
      const entries = await life.wait(() => R.entries());
      const recorded = entries.flatMap(entry => entry.sends.map(send => ({ entry, send }))).find(({ send }) => isSeed(send.to) && send.to.kind === "directory");
      if (!recorded || !isSeed(recorded.send.to)) return expect.fail("Actual retained directory creation is required");
      expect(recorded.send.to).toEqual(directorySeed);
      expect(recorded.send.to.definition).toBe("platform:directory@16");
      expect(await index.has(D.name)).toBe(false);
      const answer = await life.wait(() => namespace(indexedScopes(env.PLATFORM, settings)).transport.send({ to: recorded.send.to,
        from: factRefOf(recorded.entry), n: recorded.send.n, message: recorded.send.message }));
      expect(answer).toMatchObject({ answer: "recorded" });
      expect(await index.has(D.name, "directory")).toBe(true);
      expect((await life.wait(() => D.entries()))[0]!.input.type).toBe("genesis");
      const unknown = scopeIdOf({ ...directorySeed, ordinal: 1 });
      expect(await scopes.summary(unknown, "TEST reader")).toEqual({ ok: false, reason: "not-found" });
    }
  } finally { life.release(); }
}, 30_000);

/** Old registers are set up only by direct local Native fixtures. Their
 * genuine pending child sends receive the deployed admission checks. */
test("deployed indexed admission refuses genuine Register7 and Register8 children before target activation", async () => {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: "TEST old demo cohort refusal", sessions: false, inspector: null }), { required: false });
  try {
    life.setHold(envelope => isSeed(envelope.to) && envelope.to.kind === "directory");
    for (const pin of [DEMO_REGISTER, WEB_DEMO_REGISTER] as const) {
      const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: { host: "artifacts", namespace: "dap-demo", policy: "open", purpose: DEMO_PURPOSE }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
      const name = scopeIdOf({ v: 1, kind: "register", definition: pin, creator: null, cause: intentDigest(install), ordinal: 0 });
      const R = life.platform(name), outside = outsideOf(name); life.wire(name, () => ({ outside }));
      expect((await life.wait(() => R.stub.create(signIntent(install, rita.secret), pin))).answer).toBe("accepted");
      await runInDurableObject(env.PLATFORM.get(env.PLATFORM.idFromName(name)), instance => (instance as PlatformScope).awaitScheduledCallbacks());
      const from = await life.wait(() => R.at());
      const found = await life.wait(() => R.intent(sam, "found", { expected: { register: 1 }, fields: { branch: "main", founderHandle: "@old-demo", recoveryKey: una.key } }));
      const seed = { v: 1 as const, kind: "directory" as const, definition: DIRECTORY_OF[pin]!, creator: from, cause: intentDigest(found.intent), ordinal: 0 };
      const target = scopeIdOf(seed);
      outside.answer("1:0" as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(seedDigest(seed), 1), id: "TEST-old-demo-repository" } } });
      expect((await life.wait(() => R.stub.submit(found, []))).answer).toBe("accepted");
      await effectFixture([R], life.wait);
      const entries = await life.wait(() => R.entries());
      const emitted = entries.flatMap(entry => entry.sends.map(send => ({ entry, send }))).find(row => isSeed(row.send.to) && row.send.to.kind === "directory");
      if (!emitted || !isSeed(emitted.send.to)) return expect.fail("An actual held legacy child send is required");
      expect(emitted.send.to).toEqual(seed);
      const settings = { SCOPE_INDEX: env.SCOPE_INDEX, SCOPE_INDEX_MODE: "enforce", DEPLOYMENT: "TEST-old-demo-refusal", ARTIFACTS_NAMESPACE: "dap-demo",
        ARTIFACTS_CONFIG: JSON.stringify({ registerScope: name, namespace: "dap-demo", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" }) };
      const index = scopeIndex(settings)!;
      expect(await index.has(name, "register")).toBe(true);
      expect(await index.has(target)).toBe(false);
      // Computing an ID does not obtain a stub or activate an object.
      const targetId = env.PLATFORM.idFromName(target).toString();
      const lookups = { id: 0, get: 0 };
      const raw: Binding<DurableObjectId> = { idFromName: scope => { if (scope === target) lookups.id++; return env.PLATFORM.idFromName(scope); }, get: id => { if (id.toString() === targetId) lookups.get++; return env.PLATFORM.get(id); } };
      const answer = await life.wait(() => namespace(indexedScopes(raw, settings)).transport.send({ to: emitted.send.to, from: factRefOf(emitted.entry), n: emitted.send.n, message: emitted.send.message }));
      expect(answer).toEqual({ answer: "routing", reason: "not-found" });
      expect(lookups).toEqual({ id: 0, get: 0 });
      expect(await index.has(target)).toBe(false);
    }
  } finally { life.release(); }
}, 30_000);
