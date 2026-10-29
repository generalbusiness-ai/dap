/** Pure policy/transport witnesses plus actual DeployedScope SQLite genesis.
 * Index transport is a labelled stand-in only in the cache case. The native
 * cases override Env only: no clock, policy wiring or native authority port. */
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, PlatformDefinition, Seed } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, isSignedIntentShape, parseStrict, scopeIdOf, signIntent, timeMs, timeOf } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, UNPUBLISHED_COHORT, platform } from "@generalbusiness/dap-platform";
import { readPlatformCreationPolicy, injectedPlatformCreationPolicy, permitsNewPlatformScope } from "../src/creation-versions.ts";
import { admitChildCreation, type CreationTimer } from "../src/creation-lineage.ts";
import { indexedScopes, type ScopeIndexPort } from "../src/scope-index.ts";
import type { Binding } from "../src/namespace.ts";
import type { ScopeObject } from "../src/object.ts";
import { creationVersionSettings } from "./worker.ts";

const legacy = "platform:register@2";
const newest = ARCHIVE_DEVICE_PUBLICATION_COHORT.register;
const install = (now?: number) => signIntent({ v: 1, to: null, actor: keys.paul.key, kind: "install", on: null, expected: {},
  fields: { host: "git.example", namespace: "versions", policy: "keys", founders: [keys.rita.key] },
  idempotencyKey: crypto.randomUUID(), notAfter: timeOf((now ?? Date.now()) + 60_000) } satisfies Intent, keys.paul.secret);
const seedOf = (signed: ReturnType<typeof install>, definition: PlatformDefinition): Seed => ({ v: 1, kind: "register", definition, creator: null, cause: intentDigest(signed.intent), ordinal: 0 });

test("install fixture is a valid signed intent at an exact-second deadline", () => {
  // Control only the request's timestamp input. The deployed clock is unchanged.
  const now = Math.floor(Date.now() / 1000) * 1000, signed = install(now);
  expect(isSignedIntentShape(signed)).toBe(true);
  expect(timeMs(signed.intent.notAfter)).toBe(now + 60_000);
  const noncanonical = signIntent({ ...signed.intent, notAfter: new Date(now + 60_000).toISOString() }, keys.paul.secret);
  expect(isSignedIntentShape(noncanonical)).toBe(false);
});

test("creation policy owns bounded known pins; absent and explicit undefined default, invalid configuration closes", () => {
  // The unpublished family is an additional admitted baseline, not a change
  // to the existing hosted creation choices or their native pins.
  const expected = [...new Set([...Object.values(ARCHIVE_DEVICE_PUBLICATION_COHORT), ...Object.values(UNPUBLISHED_COHORT)])];
  for (const settings of [{}, { PLATFORM_CREATION_PINS: undefined }, { PLATFORM_CREATION_PINS: "[]" }]) {
    const policy = readPlatformCreationPolicy(settings);
    expect(policy?.pins).toEqual(expected);
    expect(permitsNewPlatformScope(policy, newest)).toBe(true);
    expect(permitsNewPlatformScope(policy, UNPUBLISHED_COHORT.register)).toBe(true);
    expect(permitsNewPlatformScope(policy, UNPUBLISHED_COHORT.directory)).toBe(true);
    expect(permitsNewPlatformScope(policy, UNPUBLISHED_COHORT.destination)).toBe(true);
    expect(permitsNewPlatformScope(policy, legacy)).toBe(false);
    expect(permitsNewPlatformScope(policy, ARCHIVE_DEVICE_APPLICATION_COHORT.register)).toBe(false);
  }
  const policy = readPlatformCreationPolicy({ PLATFORM_CREATION_PINS: JSON.stringify([legacy]) });
  expect(policy?.pins).toEqual([...expected, legacy]);
  expect(Object.isFrozen(policy)).toBe(true); expect(Object.isFrozen(policy?.pins)).toBe(true);
  for (const raw of [null, false, [], "", "{}", '["platform:register@2","platform:register@2"]', '["platform:register@999"]',
    '["sha256:' + "a".repeat(64) + '"]', " ".repeat(8193), JSON.stringify(Array(129).fill(legacy))]) {
    const invalid = readPlatformCreationPolicy({ PLATFORM_CREATION_PINS: raw });
    expect(invalid).toBeNull(); expect(permitsNewPlatformScope(invalid, newest)).toBe(false);
  }
  expect(injectedPlatformCreationPolicy({})).toBeUndefined(); // raw engine, not a deployed object
  expect(injectedPlatformCreationPolicy({ PLATFORM_CREATION_PINS: undefined })?.pins).toEqual(expected);
  expect(injectedPlatformCreationPolicy({ PLATFORM_CREATION_PINS: null })).toBeNull();
  // Catalog support is unchanged; rejection above is solely new-creation policy.
  expect(platform(legacy)).not.toBeNull();
});

test("indexed creation captures policy before awaits and changes cache identity without retaining mutable Env", async () => {
  let lookups = 0, targets = 0;
  let release!: (known: boolean) => void;
  const index: ScopeIndexPort = { has: async () => { lookups++; return new Promise<boolean>(resolve => { release = resolve; }); }, register: async () => false, async list() { throw Error("creation requested census"); } };
  const binding: Binding<string> = { idFromName: name => { targets++; return name; }, get: () => ({ create: async () => "native judge" }) };
  const settings = { SCOPE_INDEX: { idFromName: (name: string) => name, get: () => index }, PLATFORM_CREATION_PINS: "[]" as unknown };
  const signed = install(), name = scopeIdOf(seedOf(signed, legacy));
  const call = (adapter: Binding<string>, pin: PlatformDefinition = legacy) => (adapter.get(name) as { create(...args: unknown[]): Promise<unknown> }).create(signed, pin);
  const before = indexedScopes(binding, settings);
  expect(indexedScopes(binding, settings)).toBe(before);
  const refused = call(before);
  expect(lookups).toBe(1); expect(targets).toBe(0);
  settings.PLATFORM_CREATION_PINS = JSON.stringify([legacy]);
  const allowed = indexedScopes(binding, settings);
  expect(allowed).not.toBe(before);
  release(false);
  expect(await refused).toEqual({ answer: "refused", reason: "source-unverified" });
  expect(targets).toBe(0);
  settings.PLATFORM_CREATION_PINS = null;
  const invalid = indexedScopes(binding, settings);
  expect(invalid).not.toBe(allowed);
  expect(await call(allowed)).toBe("native judge"); // old adapter owns its allowlist
  const pending = call(invalid, newest);
  expect(lookups).toBe(2); expect(targets).toBe(1);
  release(false);
  expect(await pending).toEqual({ answer: "refused", reason: "source-unverified" });
  const absent = indexedScopes(binding, { SCOPE_INDEX: settings.SCOPE_INDEX, PLATFORM_CREATION_PINS: undefined });
  expect(await call(absent, newest)).toBe("native judge");
  expect(targets).toBe(2);
});

test("injected invalid or excluded child policy refuses before local and open-creation shortcuts", async () => {
  const signed = install(), root = scopeIdOf(seedOf(signed, legacy));
  const at = { scope: root, kind: "register" as const, inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" as const };
  const to: Seed = { v: 1, kind: "membership", definition: "platform:membership@2", creator: at, cause: intentDigest(signed.intent), ordinal: 0 };
  const delivered = { to, from: { at, seq: 0, hash: intentDigest(signed.intent) }, n: 0, message: { class: "request", type: "create", body: {} } };
  let lookups = 0;
  const known = { async has() { lookups++; return false; } };
  const binding: Binding = { idFromName() { throw Error("excluded child addressed a target"); }, get() { throw Error("excluded child instantiated a target"); } };
  // Synthetic envelope/index/clock exercise only early admission, not native authority.
  const clock: CreationTimer = { now: () => 0, after: () => () => {} };
  for (const settings of [{ PLATFORM_CREATION_PINS: null }, { PLATFORM_CREATION_PINS: "[]" },
    { PLATFORM_CREATION_PINS: "[]", DEPLOYMENT: "test", ALLOW_OPEN_CREATION: "true" }]) {
    expect((await admitChildCreation(binding, settings, known, delivered, clock)).kind).toBe("refused");
  }
  expect(lookups).toBe(3);
});

type Native = {
  create: ScopeObject["create"];
  submit: ScopeObject["submit"];
  source: ScopeObject["source"];
  nativeBirth(...args: Parameters<ScopeObject["nativeBirth"]>): Promise<ReturnType<ScopeObject["nativeBirth"]>>;
};
const objectOf = (name: string) => env.CREATION_VERSIONS.get(env.CREATION_VERSIONS.idFromName(name));
const count = (object: ReturnType<typeof objectOf>) => runInDurableObject(object, (_instance, state) => {
  if (state.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='entry'").toArray().length === 0) return 0;
  return state.storage.sql.exec("SELECT seq FROM entry").toArray().length;
});

test("actual deployed object defaults reject old new genesis and invalid policy rejects newest without an outer API", async () => {
  for (const [pin, raw] of [[legacy, undefined], [ARCHIVE_DEVICE_APPLICATION_COHORT.register, undefined], [newest, null], [newest, undefined]] as const) {
    const signed = install(), name = scopeIdOf(seedOf(signed, pin));
    creationVersionSettings.set(name, raw); // own undefined must have the absent-setting meaning
    const object = objectOf(name), native = object as unknown as Native;
    try {
      const answer = await native.create(signed, pin);
      if (pin === newest && raw === undefined) {
        expect(answer).toMatchObject({ answer: "accepted", receipt: { definition: newest, fact: { at: { scope: name, kind: "register" }, seq: 0 } } });
        expect(await count(object)).toBe(1);
      } else {
        expect(answer).toEqual({ answer: "refused", reason: "unsupported-definition" });
        expect(await count(object)).toBe(0);
      }
    } finally { await evictDurableObject(object); creationVersionSettings.delete(name); }
  }
});

test("old live deployed genesis needs sealed applied integrity for repeats while reads and acts keep its pin", async () => {
  const signed = install(), seed = seedOf(signed, legacy), name = scopeIdOf(seed);
  creationVersionSettings.set(name, JSON.stringify([legacy]));
  const object = objectOf(name), native = object as unknown as Native;
  try {
    const original = await native.create(signed, legacy);
    expect(original).toMatchObject({ answer: "accepted" });
    if (original.answer !== "accepted") throw Error("real legacy genesis required");
    const at = original.receipt.fact.at;
    const stored = await runInDurableObject(object, (_instance, state) => String(state.storage.sql.exec("SELECT bytes FROM entry WHERE seq=0").one()["bytes"]));
    await evictDurableObject(object);
    creationVersionSettings.set(name, null);
    expect(await native.create(signed, legacy)).toEqual(original);
    expect((await native.nativeBirth(at, 1000))?.named).toBe(legacy);
    expect(parseStrict((await native.source(0))?.bytes ?? "null")).toMatchObject({ input: { type: "genesis", seed, decision: "applied" } });
    const changed = signIntent({ ...signed.intent, idempotencyKey: crypto.randomUUID() }, keys.paul.secret);
    expect(await native.create(changed, legacy)).toEqual({ answer: "refused", reason: "unsupported-definition" });
    // Corrupt only the retained body. Matching table/meta/index identity is not a sealed birth.
    await runInDurableObject(object, (_instance, state) => { state.storage.sql.exec("UPDATE entry SET bytes=? WHERE seq=0", stored + " ").toArray(); });
    try { expect(await native.create(signed, legacy)).toEqual({ answer: "refused", reason: "unsupported-definition" }); }
    finally { await runInDurableObject(object, (_instance, state) => { state.storage.sql.exec("UPDATE entry SET bytes=? WHERE seq=0", stored).toArray(); }); }
    expect(await native.create(signed, legacy)).toEqual(original);
    const found = signIntent({ v: 1, to: at, actor: keys.rita.key, kind: "found", on: null, expected: { register: 1 },
      fields: { branch: "main", founderHandle: "@rita", recoveryKey: keys.sam.key }, idempotencyKey: crypto.randomUUID(),
      notAfter: timeOf(Date.now() + 60_000) } satisfies Intent, keys.rita.secret);
    expect(await native.submit(found, [])).toMatchObject({ answer: "accepted", receipt: { definition: legacy, fact: { at, seq: 1 } } });
    const old = parseStrict(stored);
    expect((await native.source(0))?.bytes).toBe(canonicalize(old));
  } finally { await evictDurableObject(object); creationVersionSettings.delete(name); }
});
