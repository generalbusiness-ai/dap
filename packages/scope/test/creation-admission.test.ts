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
import { parentlessCreationAdmission } from "../src/creation-admission.ts";
import { readRegisterScope } from "../src/register-setting.ts";
import { UNPUBLISHED_COHORT } from "@generalbusiness/dap-platform";

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
    fields: { host: "artifacts", namespace: "artroom-demo", policy: "open" }, idempotencyKey: `pinned-install-${crypto.randomUUID()}`, notAfter: "2030-01-01T00:00:00Z" };
  const signed = signIntent(intent, secret);
  const seed: Seed = { v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(intent), ordinal: 0 };
  const name = scopeIdOf(seed), addressed: string[] = [];
  let targetGets = 0;
  const unavailable = { answer: "unavailable", reason: "unavailable" } as const;
  const binding: Binding<string> = { idFromName: name => { addressed.push(name); return name; }, get: () => { targetGets++; return { create: async () => unavailable }; } };
  const config = JSON.stringify({ registerScope: name, namespace: "artroom-demo", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" });
  // Explicit historical pin keeps this R1 witness separate from R6 defaults.
  const settings: CreationAdmission = { PLATFORM_CREATION_PINS: JSON.stringify([seed.definition]), DEPLOYMENT: "creation-admission-test", ARTIFACTS_CONFIG: config, ARTIFACTS: {} };
  // A fresh signed/configured R1 register is not permission to create an excluded pin.
  // The unique install names an unlisted scope in the real fixed index.
  expect(await api(binding, null, { ...settings, PLATFORM_CREATION_PINS: "[]", SCOPE_INDEX: env.SCOPE_INDEX }).create(signed, seed.definition))
    .toEqual({ answer: "refused", reason: "unsupported-definition" });
  expect(addressed).toEqual([]); expect(targetGets).toBe(0);
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
  for (const DEPLOYMENT of ["", "a".repeat(129), "界".repeat(43)]) {
    expect(await api(binding, null, { SCOPE_INDEX: env.SCOPE_INDEX, DEPLOYMENT, ALLOW_OPEN_CREATION: "true" }).create(changed, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  }
  expect(addressed).toEqual([]);
  // An explicit test escape retains its behavior only with a valid pin.
  const opening = { SCOPE_INDEX: env.SCOPE_INDEX, DEPLOYMENT: "local-test", ALLOW_OPEN_CREATION: "true", PLATFORM_CREATION_PINS: JSON.stringify([seed.definition]), ARTIFACTS: {} };
  expect(await api(binding, null, opening).create(changed, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  expect(addressed).toEqual([]);
  expect(await api(binding, null, { ...opening, REGISTER_SCOPE: name }).create(changed, seed.definition)).toEqual(unavailable);
  expect(addressed.splice(0)).toEqual([changedName]);
  // The local creation opening is not an unconfigured rate-limit bypass.
  expect(await api(binding).create(changed, seed.definition)).toEqual(unavailable);
  expect(addressed).toEqual([]);
});

test("Register selection is host-independent and deployed host checks follow exact install authorization", async () => {
  const secret = crypto.getRandomValues(new Uint8Array(32)), actor = keyIdOfSecret(secret);
  const signed = signIntent({ v: 1, to: null, actor, kind: "install", on: null, expected: {}, fields: { host: "none", policy: "open" },
    idempotencyKey: crypto.randomUUID(), notAfter: "2030-01-01T00:00:00Z" }, secret);
  const seed: Seed = { v: 1, kind: "register", definition: UNPUBLISHED_COHORT.register, creator: null, cause: intentDigest(signed.intent), ordinal: 0 };
  const name = scopeIdOf(seed), settings = { DEPLOYMENT: "TEST-host-none-admission", REGISTER_SCOPE: name };
  const config = (registerScope: string) => JSON.stringify({ registerScope, namespace: "TEST-none", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" });
  expect(readRegisterScope({})).toEqual({ kind: "absent" });
  for (const configured of [{ REGISTER_SCOPE: name }, { ARTIFACTS_CONFIG: config(name) }, { REGISTER_SCOPE: name, ARTIFACTS_CONFIG: config(name) }]) {
    expect(readRegisterScope(configured)).toEqual({ kind: "pinned", scope: name });
  }
  const other = scopeIdOf({ ...seed, ordinal: 1 });
  for (const configured of [{ REGISTER_SCOPE: ` ${name}` }, { ARTIFACTS_CONFIG: "{}" }, { REGISTER_SCOPE: name, ARTIFACTS_CONFIG: "{}" }, { REGISTER_SCOPE: name, ARTIFACTS_CONFIG: config(other) }]) {
    expect(readRegisterScope(configured)).toEqual({ kind: "misconfigured" });
    expect(parentlessCreationAdmission({ ...settings, ...configured, ALLOW_OPEN_CREATION: "true" }, signed, seed)).toEqual({ ok: false, reason: "misconfigured" });
  }
  expect(parentlessCreationAdmission({ DEPLOYMENT: "TEST-none", ALLOW_OPEN_CREATION: "true" }, signed, seed)).toEqual({ ok: false, reason: "unauthorized" });
  expect(parentlessCreationAdmission(settings, signed, seed)).toEqual({ ok: true });
  const oldSeed: Seed = { ...seed, definition: "platform:register@3" };
  expect(parentlessCreationAdmission(settings, signed, oldSeed)).toEqual({ ok: false, reason: "unauthorized" });
  expect(parentlessCreationAdmission({ ...settings, REGISTER_SCOPE: scopeIdOf(oldSeed) }, signed, oldSeed)).toEqual({ ok: false, reason: "unsupported-definition" });
  const artifacts = signIntent({ ...signed.intent, fields: { host: "artifacts", namespace: "TEST-none", policy: "open" } }, secret);
  const artifactsSeed: Seed = { ...seed, cause: intentDigest(artifacts.intent) };
  expect(parentlessCreationAdmission(settings, artifacts, artifactsSeed)).toEqual({ ok: false, reason: "unauthorized" });
  expect(parentlessCreationAdmission({ ...settings, REGISTER_SCOPE: scopeIdOf(artifactsSeed) }, artifacts, artifactsSeed)).toEqual({ ok: false, reason: "host-unavailable" });
  expect(parentlessCreationAdmission({ ...settings, REGISTER_SCOPE: scopeIdOf(artifactsSeed), ARTIFACTS: {} }, artifacts, artifactsSeed)).toEqual({ ok: true });
  // Actual ingress with a labelled namespace stand-in: admission precedes lookup.
  const addressed: string[] = [], unavailable = { answer: "unavailable", reason: "unavailable" } as const;
  const binding: Binding<string> = { idFromName: value => { addressed.push(value); return value; }, get: () => ({ create: async () => unavailable }) };
  expect(await api(binding, null, { ...settings, SCOPE_INDEX: env.SCOPE_INDEX }).create(signed, seed.definition)).toEqual(unavailable);
  expect(addressed.splice(0)).toEqual([name]);
  expect(await api(binding, null, { ...settings, REGISTER_SCOPE: other, SCOPE_INDEX: env.SCOPE_INDEX }).create(signed, seed.definition)).toEqual({ answer: "refused", reason: "unauthorized" });
  expect(addressed).toEqual([]);
});
