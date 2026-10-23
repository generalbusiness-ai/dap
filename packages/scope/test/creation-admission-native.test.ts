/** Real native genesis and creator proof. The Git provider and clock are
 * STAND-INS from the existing creation-real fixture; nothing is deployed. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, Seed, ScopeApi } from "@generalbusiness/dap-contract";
import { intentDigest, scopeIdOf, seedDigest, signIntent } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { DIRECTORY, REGISTER, repositoryName } from "@generalbusiness/dap-platform";
import { creationTest } from "./worker.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { nativeFixtureLifetime, effectFixture, dispatchFixture } from "./fixtures-native.ts";
import { outsideOf } from "./outside.ts";
import { rita, sam } from "./repository.ts";
import { soon } from "./net.ts";

// Invariant: deployed service RPC admits the signed pinned register, refuses a
// different install, and preserves the register's real creator-proof delivery.
test("deployed service admits its pinned register and its judged directory child (Git host STAND-IN)", async () => {
  const owner = beginSessionFixture({ secret: null, sessions: false, inspector: null });
  const lifetime = nativeFixtureLifetime(owner, { required: false });
  const previous = creationTest.settings;
  try {
    const install: Intent = { v: 1, to: null, actor: keys.paul.key, kind: "install", on: null, expected: {}, fields: { host: "git.example", namespace: "artroom", policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = lifetime.platform(scopeIdOf({ v: 1, kind: "register", definition: REGISTER, creator: null, cause: intentDigest(install), ordinal: 0 }));
    creationTest.settings = { DEPLOYMENT: "native-creation-admission", ARTIFACTS_CONFIG: JSON.stringify({ registerScope: R.name, namespace: "artroom", host: "git.example", maxBytes: 1024, credentialIdentity: "adapter-attempt" }) };
    const api = env.CREATION_API as unknown as ScopeApi;
    const host = outsideOf(R.name);
    lifetime.wire(R.name, () => ({ outside: { accepts: () => { lifetime.active(); return host.accepts(); }, send: request => lifetime.wait(() => host.send(request)), late: deliver => { lifetime.active(); host.late(deliver); } } }));
    expect(await lifetime.wait(() => api.create(signIntent({ ...install, idempotencyKey: crypto.randomUUID() }, keys.paul.secret), REGISTER))).toEqual({ answer: "refused", reason: "unauthorized" });
    expect(await lifetime.wait(() => api.create(signIntent(install, keys.paul.secret), REGISTER))).toMatchObject({ answer: "accepted", receipt: { definition: REGISTER, fact: { at: { scope: R.name, kind: "register" }, seq: 0 } } });
    const register = await R.at();
    const found = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } });
    const seed: Seed = { v: 1, kind: "directory", definition: DIRECTORY, creator: register, cause: intentDigest(found.intent), ordinal: 0 };
    const D = lifetime.platform(scopeIdOf(seed));
    host.answer("1:0", 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name: repositoryName(seedDigest(seed), 1), id: "native-admission-repository" } } });
    expect(await R.stub.submit(found, [])).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 1 } } });
    await effectFixture([R], lifetime.wait);
    await dispatchFixture([R, D], lifetime.wait);
    expect(await D.at()).toMatchObject({ scope: D.name, kind: "directory" });
    expect((await D.entries())[0]!.input).toMatchObject({ type: "genesis", seed });
    expect(host.attempts).toEqual(["1:0#1"]);
  } finally { creationTest.settings = previous; lifetime.release(); }
});
