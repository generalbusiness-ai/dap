/** Real Register17 judgments, creator lineage, Directory16 genesis and SQLite
 * index. Git provisioning, clock and scheduling are TEST
 * stand-ins; this is not hosted deployment or provider acceptance. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, OperationId } from "@generalbusiness/dap-contract";
import { factRefOf, intentDigest, isSeed, scopeIdOf, seedDigest, signIntent } from "@generalbusiness/artroom-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, repositoryName } from "@generalbusiness/dap-platform";
import { api } from "../src/worker.ts";
import { indexedScopes, scopeIndex } from "../src/scope-index.ts";
import { namespace } from "../src/namespace.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { nativeFixtureLifetime, effectFixture } from "./support/native-fixture-lifetime.ts";
import { rita, sam, una } from "./repository.ts";
import { outsideOf } from "./outside.ts";
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
