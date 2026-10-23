/** Real routing and signature/seed admission. Namespace is a stand-in that
 * records addressing; no storage, genesis judgment or deployed host runs. */
import { expect, test } from "vitest";
import { env } from "cloudflare:workers";
import type { Intent, Seed } from "@generalbusiness/dap-contract";
import { intentDigest, keyIdOfSecret, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import room from "../../../apps/room/fetch.ts";
import worker, { api, route, type Env } from "../src/worker.ts";
import type { Binding } from "../src/namespace.ts";
import type { CreationAdmission } from "../src/creation-admission.ts";

// Invariant: a deployed parentless creation is refused before any namespace
// addressing unless it is the exact signed pinned-register install.
test("deployed creation refuses a fresh key's install and direct founding before namespace lookup through both fetch entrypoints", async () => {
  const secret = crypto.getRandomValues(new Uint8Array(32)), actor = keyIdOfSecret(secret);
  const intent: Intent = { v: 1, to: null, actor, kind: "install", on: null, expected: {},
    fields: { host: "artifacts", namespace: "artroom-demo", policy: "open" }, idempotencyKey: "uninvited-install", notAfter: "2030-01-01T00:00:00Z" };
  const install = signIntent(intent, secret), found = signIntent({ ...intent, kind: "found", idempotencyKey: "uninvited-found" }, secret);
  const addressed: string[] = [];
  const binding: Binding<string> = { idFromName: name => { addressed.push(name); return name; }, get: () => { expect.fail("A refused creation must not address an object or its SQLite storage."); } };
  const deployed = { SCOPE_INDEX: env.SCOPE_INDEX, SCOPES: binding, DEPLOYMENT: "creation-admission-test" } as unknown as Env;
  const handlers = [
    (request: Request) => route(request, binding, deployed),
    (request: Request) => worker.fetch(request, deployed),
    (request: Request) => room.fetch(request, deployed),
  ];
  for (const fetch of handlers) for (const [creation, definition] of [[install, "platform:register@3"], [found, "platform:directory@3"]] as const) {
    const response = await fetch(new Request("https://creation.test/v1/scopes", { method: "POST", body: JSON.stringify({ creation, definition }) }));
    expect([response.status, await response.json()]).toEqual([403, { answer: "refused", reason: "unauthorized" }]);
  }
  expect(addressed).toEqual([]);
});

test("only the pinned signed register install reaches creation; explicit local/test opening preserves the parentless API", async () => {
  const secret = crypto.getRandomValues(new Uint8Array(32)), actor = keyIdOfSecret(secret);
  const intent: Intent = { v: 1, to: null, actor, kind: "install", on: null, expected: {},
    fields: { host: "artifacts", namespace: "artroom-demo", policy: "open" }, idempotencyKey: "pinned-install", notAfter: "2030-01-01T00:00:00Z" };
  const signed = signIntent(intent, secret);
  const seed: Seed = { v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(intent), ordinal: 0 };
  const name = scopeIdOf(seed), addressed: string[] = [];
  const unavailable = { answer: "unavailable", reason: "unavailable" } as const;
  const binding: Binding<string> = { idFromName: name => { addressed.push(name); return name; }, get: () => ({ create: async () => unavailable }) };
  const config = JSON.stringify({ registerScope: name, namespace: "artroom-demo", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" });
  const settings: CreationAdmission = { DEPLOYMENT: "creation-admission-test", ARTIFACTS_CONFIG: config };
  expect(await api(binding, null, { ...settings, SCOPE_INDEX: env.SCOPE_INDEX }).create(signed, seed.definition)).toEqual(unavailable);
  expect(addressed.splice(0)).toEqual([name]);
  const changed = signIntent({ ...intent, idempotencyKey: "different-install" }, secret);
  const changedName = scopeIdOf({ ...seed, cause: intentDigest(changed.intent) });
  expect(changedName).not.toBe(name);
  expect(await api(binding, null, { ...settings, SCOPE_INDEX: env.SCOPE_INDEX }).create(changed, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  expect(await api(binding, null, { ...settings, SCOPE_INDEX: env.SCOPE_INDEX }).create({ ...signed, sig: changed.sig }, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  for (const ALLOW_OPEN_CREATION of [undefined, "false", "TRUE", "1"]) {
    expect(await api(binding, null, { SCOPE_INDEX: env.SCOPE_INDEX, DEPLOYMENT: "test", ...(ALLOW_OPEN_CREATION === undefined ? {} : { ALLOW_OPEN_CREATION }) }).create(changed, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  }
  expect(addressed).toEqual([]);
  expect(await api(binding, null, { SCOPE_INDEX: env.SCOPE_INDEX, DEPLOYMENT: "local-test", ALLOW_OPEN_CREATION: "true" }).create(changed, seed.definition)).toEqual(unavailable);
  expect(addressed.splice(0)).toEqual([changedName]);
  // The local creation opening is not an unconfigured rate-limit bypass.
  expect(await api(binding).create(changed, seed.definition)).toEqual(unavailable);
  expect(addressed).toEqual([]);
});
