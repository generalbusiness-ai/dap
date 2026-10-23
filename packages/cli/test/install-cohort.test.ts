import { expect, test } from "vitest";
import type { PlatformDefinition, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, timeMs } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import { INVITATION_KEY_COHORT, APPLICATION_COHORT, FILE_PUBLICATION_COHORT, TRUSTED_APPLICATION_COHORT, DECLARED_APPLICATION_COHORT, ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { command, install, installPlanned, memoryStore, planInstall, type Config, type Context, type Store } from "../src/index.ts";

const SERVICE = "https://cohort.test";
const COHORT = "trusted-application" as const;
const COHORTS = [
  { name: "archive-application", definition: ARCHIVE_APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-declared-application", definition: ARCHIVE_DECLARED_APPLICATION_COHORT.register, other: COHORT },
  { name: "device-application", definition: DEVICE_APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-device-application", definition: ARCHIVE_DEVICE_APPLICATION_COHORT.register, other: COHORT },
  { name: "declared-application", definition: DECLARED_APPLICATION_COHORT.register, other: COHORT },
  { name: "invitation-key", definition: INVITATION_KEY_COHORT.register, other: COHORT },
  { name: COHORT, definition: TRUSTED_APPLICATION_COHORT.register, other: "application" },
  { name: "application-publication", definition: FILE_PUBLICATION_COHORT.register, other: COHORT },
  { name: "application", definition: APPLICATION_COHORT.register, other: COHORT },
] as const;
// Fake service answers and memory storage: no native authority or host proof.
function scenario(fault: "none" | "reply" | "save" = "none") {
  const store = memoryStore();
  const bodies: string[] = [];
  let failed = false;
  let saves = 0;
  let keyReads = 0;
  let keyWrites = 0;
  let receipt: Receipt | null = null;
  const wrapped: Store = {
    ...store,
    secret: async name => { keyReads++; return store.secret(name); },
    keep: async (name, key) => { keyWrites++; await store.keep(name, key); },
    save: async config => {
      saves++;
      if (fault === "save" && !failed && config.register) { failed = true; throw new Error("fake final config-save loss"); }
      await store.save(config);
    },
  };
  const ctx: Context = {
    store: wrapped, now: () => Date.parse("2026-10-09T12:00:00Z"),
    fetch: (async (_url, init) => {
      const body = String(init?.body);
      const request = JSON.parse(body) as { creation: SignedIntent; definition: PlatformDefinition };
      const kept = (await store.config())!;
      if (COHORTS.some(cohort => cohort.definition === request.definition)) {
        expect(kept.plan?.attempted).toMatch(/^sha256:/);
        expect(canonicalize(kept.plan?.["founding"])).toBe(canonicalize(request.creation));
        expect(kept.plan?.definition).toBe(request.definition);
      }
      bodies.push(body);
      receipt ??= {
        fact: { at: { kind: "register", scope: scopeIdOf({ v: 1, kind: "register", definition: request.definition, creator: null, cause: intentDigest(request.creation.intent), ordinal: 0 }), inc: newIncarnation(new Uint8Array(16).fill(9)) }, seq: 0, hash: textDigest("fake service acknowledgement") },
        definition: request.definition, intent: intentDigest(request.creation.intent), effects: [], sends: [], epoch: 0,
      };
      if (fault === "reply" && !failed) { failed = true; throw new Error("fake accepted reply loss"); }
      return new Response(JSON.stringify({ answer: "accepted", receipt }));
    }) as Fetch,
  };
  ctx.trustedCreationService = { service: SERVICE, fetch: ctx.fetch! };
  return { ctx, store, bodies, metrics: () => ({ saves, keyReads, keyWrites }) };
}

test("closed cohort selection preserves legacy defaults and refuses retained binding conflicts without replacing custody", async () => {
  const bad = scenario();
  for (const args of [["install", SERVICE, "--cohort"], ["install", SERVICE, "--cohort", "latest"], ["install", SERVICE, "--cohort", "counting-commitments"], ["install", SERVICE, "--cohort", ""], ["install", SERVICE, "--cohort", COHORT, "--cohort", COHORT], ["install", SERVICE, "--cohort", "application", "--cohort", COHORT]]) {
    expect((await command(bad.ctx, args)).code).toBe(2);
  }
  expect((await install(bad.ctx, SERVICE, { cohort: "latest" as never })).code).toBe(2);
  expect([bad.metrics(), bad.bodies, await bad.store.config()]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, [], null]);
  // A well-shaped retained Counter plan still cannot create a new room.
  const retired = scenario();
  expect((await planInstall(retired.ctx, SERVICE, { cohort: COHORT })).code).toBe(0);
  const configured = (await retired.store.config())!, founding = configured.plan!["founding"];
  const retiredPlan = { ...configured.plan!, definition: "platform:register@6" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@6", creator: null, cause: intentDigest(founding.intent), ordinal: 0 }) };
  await retired.store.save({ ...configured, plan: retiredPlan });
  const retiredMetrics = retired.metrics();
  expect(await installPlanned(retired.ctx)).toMatchObject({ code: 1, lines: [expect.stringMatching(/^Refused: retired-cohort/)] });
  expect([retired.metrics(), retired.bodies, (await retired.store.config())!.plan]).toEqual([retiredMetrics, [], retiredPlan]);
  const legacy = scenario();
  expect((await command(legacy.ctx, ["install", "--plan", SERVICE])).code).toBe(0);
  const legacyPlan = (await legacy.store.config())!.plan!;
  expect(legacyPlan.definition).toBe("platform:register@3");
  for (const { name } of COHORTS) {
    const metrics = legacy.metrics();
    expect((await command(legacy.ctx, ["install", SERVICE, "--cohort", name])).code).toBe(1);
    expect((await command(legacy.ctx, ["install", "--planned", "--cohort", name])).code).toBe(1);
    expect([(await legacy.store.config())!.plan, legacy.metrics(), legacy.bodies]).toEqual([legacyPlan, metrics, []]);
  }
  expect((await command(legacy.ctx, ["install", SERVICE])).code).toBe(0);
  expect((await legacy.store.config())!.register!.scope).not.toBe(legacyPlan.register);

  for (const { name, definition, other } of COHORTS) {
    const s = scenario();
    expect((await command(s.ctx, ["install", "--plan", SERVICE, "--cohort", name, "--host", "artifacts", "--namespace", "room"])).code).toBe(0);
    const original = (await s.store.config())!;
    expect([original.plan!.definition, s.bodies]).toEqual([definition, []]);
    expect((await command(s.ctx, ["install", "--plan", SERVICE, "--cohort", name])).code).toBe(0);
    expect(await s.store.config()).toEqual(original);
    const metrics = s.metrics();
    for (const args of [
      ["install", SERVICE, "--cohort", name, "--host", "github.com"],
      ["install", "--plan", SERVICE, "--cohort", name, "--namespace", "other"],
      ["install", "https://other.test", "--cohort", name],
      ["install", SERVICE, "--cohort", other], ["install", "--plan", SERVICE, "--cohort", other],
      ["install", "--planned", "--cohort", other],
      ["install", SERVICE], ["install", "--plan", SERVICE],
    ]) {
      expect((await command(s.ctx, args)).code).toBe(1);
      expect(await s.store.config()).toEqual(original);
    }
    expect([s.metrics(), s.bodies]).toEqual([metrics, []]);
    expect((await command(s.ctx, ["install", "--planned", "--host", "artifacts", "--cohort", name])).code).toBe(2);
    expect((await command(s.ctx, ["install", "--planned"])).code).toBe(0);
    expect(canonicalize((await s.store.config())!.plan!["founding"])).toBe(canonicalize(original.plan!["founding"]));
    expect((await s.store.config())!.register!.scope).toBe(original.plan!.register);

    // A separate memory store stands for an empty selected config directory.
    // The expired selected plan is retained; planning there cannot renew it.
    const expired = scenario();
    const where = ["--cohort", name, "--host", "artifacts", "--namespace", "room"];
    expect((await command(expired.ctx, ["install", "--plan", SERVICE, ...where])).code).toBe(0);
    const expiredConfig = (await expired.store.config())!;
    const deadline = timeMs(expiredConfig.plan!["founding"].intent.notAfter)!;
    expired.ctx.now = () => deadline + 1;
    const before = expired.metrics();
    expect((await command(expired.ctx, ["install", "--plan", SERVICE, ...where])).code).toBe(0);
    for (const args of [
      ["install", "--planned", "--cohort", name],
      ["install", "--planned"],
      ["install", SERVICE, ...where],
    ]) {
      const refused = await command(expired.ctx, args);
      expect(refused.code).toBe(1);
      expect(refused.lines[0]).toContain(`For a new ${name} plan, set DAP_HOME to a separate empty directory`);
      expect(refused.lines[0]).toContain("If ARTROOM_HOME is set, unset it or set it to that same new directory");
      expect(refused.lines[0]).toContain("different directories refuse before configuration is read");
      expect(refused.lines[0]).not.toContain("Plan again");
      expect([await expired.store.config(), expired.bodies]).toEqual([expiredConfig, []]);
    }
    expect([expired.metrics().saves, expired.metrics().keyWrites]).toEqual([before.saves, before.keyWrites]);
    const separate = scenario();
    separate.ctx.now = expired.ctx.now;
    expect((await command(separate.ctx, ["install", "--plan", SERVICE, ...where])).code).toBe(0);
    const freshPlan = (await separate.store.config())!.plan!;
    expect([freshPlan.definition, freshPlan["founding"].intent.fields]).toEqual([expiredConfig.plan!.definition, { ...expiredConfig.plan!["founding"].intent.fields, "founders": [freshPlan["founding"].intent.actor] }]);
    expect(freshPlan.register).not.toBe(expiredConfig.plan!.register);
    expect(timeMs(freshPlan["founding"].intent.notAfter)!).toBeGreaterThan(separate.ctx.now());
    expect((await command(separate.ctx, ["install", "--planned", "--cohort", name])).code).toBe(0);
    expect((await separate.store.config())!.register!.scope).toBe(freshPlan.register);
    expect([await expired.store.config(), expired.bodies]).toEqual([expiredConfig, []]);
  }
});

test("selected delivery requires exact plan and attempt readback and recovers the original envelope after reply or final-save loss", async () => {
  for (const { name } of COHORTS) {
    for (const mode of ["reply", "save"] as const) {
      const s = scenario(mode);
      const first = await install(s.ctx, SERVICE, { cohort: name }).catch(() => ({ code: 1 }));
      expect(first.code).toBe(1);
      const pending = (await s.store.config())!;
      expect([pending.register, pending.plan?.attempted]).toEqual([undefined, expect.stringMatching(/^sha256:/)]);
      const original = canonicalize(pending.plan!["founding"]);
      // Expiry cannot replace a possibly delivered or acknowledged original.
      s.ctx.now = () => timeMs(pending.plan!["founding"].intent.notAfter)! + 901_000;
      expect((await planInstall(s.ctx, SERVICE, { cohort: name })).code).toBe(0);
      expect(await s.store.config()).toEqual(pending);
      expect((await install(s.ctx, SERVICE, { cohort: name })).code).toBe(0);
      const kept = (await s.store.config())!;
      expect([kept.register!.scope, canonicalize(kept.plan!["founding"]), new Set(s.bodies).size]).toEqual([pending.plan!.register, original, 1]);
    }
    // A store that silently drops the attempted marker provides no custody.
    const s = scenario();
    expect((await planInstall(s.ctx, SERVICE, { cohort: name })).code).toBe(0);
    const original: Config = (await s.store.config())!;
    s.ctx.store = { ...s.ctx.store, save: async next => { if (!next.plan?.attempted) await s.store.save(next); } };
    expect((await installPlanned(s.ctx, { cohort: name })).code).toBe(1);
    expect([s.bodies, await s.store.config()]).toEqual([[], original]);
    // A save callback mutating its argument cannot replace the signed plan.
    const changed = scenario();
    changed.ctx.store = { ...changed.ctx.store, save: async next => {
      if (next.plan) next.plan.service = "https://substituted.test";
      await changed.store.save(next);
    } };
    expect((await install(changed.ctx, SERVICE, { cohort: name })).code).toBe(1);
    expect(changed.bodies).toEqual([]);
  }
});


// Invariant: application options cannot fall through into register creation
// or signing when the URI/options or persistent custody are unavailable.
test("application install syntax and custody failures never create a register", async () => {
  const s = scenario(), uri = `git+https://packages.test/apps.git/@${"a".repeat(40)}/counter.dap.json`, release = `sha256:${"b".repeat(64)}`;
  for (const args of [
    ["install", uri], ["install", uri, "--release", release],
    ["install", uri, "--release", release, "--release", release, "--request", "counter-1"],
    ["install", uri, "--release", release, "--request", "counter-1", "--cohort", COHORT],
    ["install", uri, "--release", release, "--request", "counter-1", "--values", "{"],
    ["install", SERVICE, "--release", release, "--request", "counter-1"],
    ["application", "01"], ["application", "-1"],
  ]) expect((await command(s.ctx, args)).code).toBe(2);
  expect(await command(s.ctx, ["install", uri, "--release", release, "--request", "counter-1"])).toMatchObject({ code: 1, lines: [expect.stringContaining("Persistent application request custody")] });
  expect([s.metrics(), s.bodies, await s.store.config()]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, [], null]);
});

// Fake acknowledgements show CLI custody/selection only; the native policy
// and indexed lineage witness is demo-register.test.ts in the Scope project.
test("open register install is explicit, fixed to Register17 and retained across planned delivery", async () => {
  const invalid = scenario();
  for (const args of [
    ["install", SERVICE, "--register-policy", "public"],
    ["install", SERVICE, "--register-policy", "open", "--register-policy", "keys"],
    ["install", SERVICE, "--register-policy", "open", "--cohort", "application"],
  ]) expect((await command(invalid.ctx, args)).code).toBe(2);
  expect([invalid.metrics(), invalid.bodies]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, []]);
  const planned = scenario();
  expect((await command(planned.ctx, ["install", "--plan", SERVICE, "--register-policy", "open", "--host", "artifacts", "--namespace", "dap-demo"])).code).toBe(0);
  const original = (await planned.store.config())!;
  expect(original.plan!.definition).toBe("platform:register@17");
  expect(original.plan!["founding"].intent.fields).toMatchObject({ policy: "open", founders: [original.plan!["founding"].intent.actor] });
  expect(planned.bodies).toEqual([]);
  for (const args of [["install", "--planned", "--register-policy", "keys"], ["install", "--plan", SERVICE, "--register-policy", "keys", "--cohort", "archive-device-application"]]) {
    expect((await command(planned.ctx, args)).code).toBe(1);
    expect(await planned.store.config()).toEqual(original); expect(planned.bodies).toEqual([]);
  }
  expect((await command(planned.ctx, ["install", "--planned"])).code).toBe(0);
  expect(JSON.parse(planned.bodies[0]!).creation).toEqual(original.plan!["founding"]);
  const direct = scenario();
  expect((await command(direct.ctx, ["install", SERVICE, "--register-policy", "open"])).code).toBe(0);
  expect(JSON.parse(direct.bodies[0]!)).toMatchObject({ definition: "platform:register@17", creation: { intent: { fields: { policy: "open" } } } });
  const keys = scenario();
  expect((await command(keys.ctx, ["install", "--plan", SERVICE, "--cohort", "archive-device-application"])).code).toBe(0);
  expect((await keys.store.config())!.plan!["founding"].intent.fields["policy"]).toBe("keys");
  expect((await command(keys.ctx, ["install", "--planned", "--register-policy", "open"])).code).toBe(1);
  expect(keys.bodies).toEqual([]);
});
