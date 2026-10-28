import { retainHistoricalInstallPlan } from "./support/historical-install-plan.ts";
import { expect, test } from "vitest";
import type { PlatformDefinition, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, intentDigest, newIncarnation, scopeIdOf, textDigest, timeMs } from "@generalbusiness/dap-bytes";
import type { Fetch } from "@generalbusiness/dap-client";
import { UNPUBLISHED_COHORT, INVITATION_KEY_COHORT, APPLICATION_COHORT, FILE_PUBLICATION_COHORT, TRUSTED_APPLICATION_COHORT, DECLARED_APPLICATION_COHORT, ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT } from "@generalbusiness/dap-platform";
import { CREATION_COHORTS } from "../../scope/src/creation-lineage.ts";
import { CREATION_INSTALL_COHORTS, USAGE, command, install, installPlanned, memoryStore, planInstall, type Config, type Context, type Store } from "../src/index.ts";

const SERVICE = "https://cohort.test";
const COHORT = "trusted-application" as const;
const COHORTS = [
  { name: "unpublished", definition: UNPUBLISHED_COHORT.register, other: COHORT },
  { name: "file-publication", definition: "platform:register@3", other: COHORT },
  { name: "archive-application", definition: ARCHIVE_APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-declared-application", definition: ARCHIVE_DECLARED_APPLICATION_COHORT.register, other: COHORT },
  { name: "device-application", definition: DEVICE_APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-device-application", definition: ARCHIVE_DEVICE_APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-device-publication", definition: ARCHIVE_DEVICE_PUBLICATION_COHORT.register, other: COHORT },
  { name: "declared-application", definition: DECLARED_APPLICATION_COHORT.register, other: COHORT },
  { name: "invitation-key", definition: INVITATION_KEY_COHORT.register, other: COHORT },
  { name: COHORT, definition: TRUSTED_APPLICATION_COHORT.register, other: "application" },
  { name: "application-publication", definition: FILE_PUBLICATION_COHORT.register, other: COHORT },
  { name: "application", definition: APPLICATION_COHORT.register, other: COHORT },
  { name: "archive-certified-rules", definition: ARCHIVE_CERTIFIED_RULES_COHORT.register, other: COHORT },
  { name: "hardened-certified-rules", definition: HARDENED_CERTIFIED_RULES_COHORT.register, other: COHORT },
] as const;
// Fake service answers and memory storage: no native authority or host proof.
function scenario(fault: "none" | "reply" | "save" = "none", replaceUnsentLegacy = false) {
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
      if (replaceUnsentLegacy && kept.plan?.definition === "platform:register@3" && kept.plan.attempted === undefined) {
        // This one direct-default path may replace a definitely-unsent old plan.
        expect(request.definition).toBe("platform:register@18");
      } else if (COHORTS.some(cohort => cohort.definition === request.definition)) {
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

// A historical config fixture, not a new-creation path. Its signed intent is
// retained unchanged; the register pin and ID describe the saved old plan.
async function retainedPlan(s: ReturnType<typeof scenario>, name: typeof COHORTS[number]["name"], options: { host?: string; namespace?: string } = {}) {
  if (CREATION_INSTALL_COHORTS.some(current => current === name)) {
    expect((await planInstall(s.ctx, SERVICE, { host: "github.com", ...options, cohort: name })).code).toBe(0);
  } else {
    await retainHistoricalInstallPlan(s.ctx, SERVICE, COHORTS.find(cohort => cohort.name === name)!.definition, options);
  }
}

test("fresh creation offers exactly admitted families and refuses historical selectors before custody", async () => {
  const admitted = new Set(CREATION_COHORTS.map(cohort => cohort.register));
  const offered = COHORTS.filter(cohort => CREATION_INSTALL_COHORTS.some(name => name === cohort.name));
  expect(offered.map(cohort => cohort.definition).sort()).toEqual([...admitted].sort());
  const help = USAGE.split("\n").filter(line => line.includes("[--cohort ") && !line.includes("--planned"));
  expect(help).toHaveLength(2);
  for (const { name, definition } of COHORTS) {
    const s = scenario();
    if (admitted.has(definition as never)) {
      expect((await command(s.ctx, ["install", "--plan", SERVICE, "--cohort", name, "--host", "github.com"])).code).toBe(0);
      expect((await s.store.config())!.plan!.definition).toBe(definition);
      expect(help.every(line => line.includes(name))).toBe(true);
    } else {
      for (const args of [["install", SERVICE, "--cohort", name, "--host", "github.com"], ["install", "--plan", SERVICE, "--cohort", name, "--host", "github.com"]])
        expect(await command(s.ctx, args)).toMatchObject({ code: 2, lines: [expect.stringContaining("historical install plans only")] });
      expect((await install(s.ctx, SERVICE, { host: "github.com", cohort: name })).code).toBe(2);
      expect((await planInstall(s.ctx, SERVICE, { host: "github.com", cohort: name })).code).toBe(2);
      expect([s.metrics(), s.bodies, await s.store.config()]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, [], null]);
      expect(help.every(line => !line.split("[--cohort ")[1]!.split("]")[0]!.split("|").includes(name))).toBe(true);
    }
  }
});

test("closed cohort selection uses the new default and preserves retained historical plans without replacing custody", async () => {
  const bad = scenario();
  for (const args of [["install", SERVICE, "--cohort", "--host", "github.com"], ["install", SERVICE, "--cohort", "latest", "--host", "github.com"], ["install", SERVICE, "--cohort", "counting-commitments", "--host", "github.com"], ["install", SERVICE, "--cohort", "", "--host", "github.com"], ["install", SERVICE, "--cohort", COHORT, "--cohort", COHORT, "--host", "github.com"], ["install", SERVICE, "--cohort", "application", "--cohort", COHORT, "--host", "github.com"]]) {
    expect((await command(bad.ctx, args)).code).toBe(2);
  }
  expect((await install(bad.ctx, SERVICE, { host: "github.com", cohort: "latest" as never })).code).toBe(2);
  expect([bad.metrics(), bad.bodies, await bad.store.config()]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, [], null]);
  // A well-shaped retained Counter plan still cannot create a new room.
  const retired = scenario();
  await retainedPlan(retired, COHORT);
  const configured = (await retired.store.config())!, founding = configured.plan!["founding"];
  const retiredPlan = { ...configured.plan!, definition: "platform:register@6" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@6", creator: null, cause: intentDigest(founding.intent), ordinal: 0 }) };
  await retired.store.save({ ...configured, plan: retiredPlan });
  const retiredMetrics = retired.metrics();
  expect(await installPlanned(retired.ctx)).toMatchObject({ code: 1, lines: [expect.stringMatching(/^Refused: retired-cohort/)] });
  expect([retired.metrics(), retired.bodies, (await retired.store.config())!.plan]).toEqual([retiredMetrics, [], retiredPlan]);
  const legacy = scenario("none", true);
  expect((await command(legacy.ctx, ["install", "--plan", SERVICE, "--host", "github.com"])).code).toBe(0);
  const fresh = (await legacy.store.config())!;
  expect(fresh.plan!.definition).toBe("platform:register@18");
  // A pre-upgrade, definitely-unsent plan keeps its exact old version/ID.
  const legacyPlan = { ...fresh.plan!, definition: "platform:register@3" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(fresh.plan!["founding"].intent), ordinal: 0 }) };
  await legacy.store.save({ ...fresh, plan: legacyPlan });
  for (const { name } of COHORTS.filter(cohort => cohort.name !== "file-publication")) {
    const metrics = legacy.metrics();
    expect((await command(legacy.ctx, ["install", SERVICE, "--cohort", name, "--host", "github.com"])).code).toBe(1);
    expect((await command(legacy.ctx, ["install", "--planned", "--cohort", name])).code).toBe(1);
    expect([(await legacy.store.config())!.plan, legacy.metrics(), legacy.bodies]).toEqual([legacyPlan, metrics, []]);
  }
  expect((await command(legacy.ctx, ["install", SERVICE, "--host", "github.com"])).code).toBe(0);
  expect((await legacy.store.config())!.register!.scope).not.toBe(legacyPlan.register);

  // Explicitly selecting a matching old plan promotes only local custody.
  const promotion = scenario();
  expect((await planInstall(promotion.ctx, SERVICE, { host: "github.com" })).code).toBe(0);
  const unmarked = (await promotion.store.config())!;
  const historical = { ...unmarked.plan!, definition: "platform:register@3" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(unmarked.plan!["founding"].intent), ordinal: 0 }) };
  await promotion.store.save({ ...unmarked, plan: historical });
  const promotionMetrics = promotion.metrics();
  expect((await planInstall(promotion.ctx, SERVICE, { host: "github.com", cohort: "file-publication" })).code).toBe(0);
  const promoted = (await promotion.store.config())!;
  expect(promoted).toEqual({ ...unmarked, plan: { ...historical, selected: true } });
  expect([promotion.metrics(), promotion.bodies]).toEqual([{ ...promotionMetrics, saves: promotionMetrics.saves + 1 }, []]);
  expect((await install(promotion.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
  expect((await planInstall(promotion.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
  expect(await promotion.store.config()).toEqual(promoted);

  // A dropped promotion marker cannot be used as exact selected custody.
  const dropped = scenario();
  expect((await planInstall(dropped.ctx, SERVICE, { host: "github.com" })).code).toBe(0);
  const droppedConfig = (await dropped.store.config())!;
  const droppedPlan = { ...droppedConfig.plan!, definition: "platform:register@3" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(droppedConfig.plan!["founding"].intent), ordinal: 0 }) };
  await dropped.store.save({ ...droppedConfig, plan: droppedPlan });
  dropped.ctx.store = { ...dropped.ctx.store, save: async next => {
    const copy = structuredClone(next); if (copy.plan) delete copy.plan.selected;
    await dropped.store.save(copy);
  } };
  expect((await planInstall(dropped.ctx, SERVICE, { host: "github.com", cohort: "file-publication" })).code).toBe(1);
  expect([dropped.bodies, (await dropped.store.config())!.plan]).toEqual([[], droppedPlan]);

  // Unknown marker values refuse both implicit replacement and exact delivery.
  for (const selected of [false, "true", null, undefined]) {
    const malformed = scenario();
    expect((await planInstall(malformed.ctx, SERVICE, { host: "github.com" })).code).toBe(0);
    const config = (await malformed.store.config())!;
    await malformed.store.save({ ...config, plan: { ...config.plan!, selected: selected as never } });
    const saved = await malformed.store.config(), metrics = malformed.metrics();
    expect((await install(malformed.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
    expect((await planInstall(malformed.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
    expect((await planInstall(malformed.ctx, SERVICE, { host: "github.com", cohort: "file-publication" })).code).toBe(1);
    expect((await installPlanned(malformed.ctx)).code).toBe(1);
    expect([malformed.bodies, await malformed.store.config(), malformed.metrics()]).toEqual([[], saved, metrics]);
  }

  const recovery = scenario("reply");
  await planInstall(recovery.ctx, SERVICE, { host: "github.com" });
  const configuredRecovery = (await recovery.store.config())!;
  const oldPlan = { ...configuredRecovery.plan!, definition: "platform:register@3" as const, register: scopeIdOf({ v: 1, kind: "register", definition: "platform:register@3", creator: null, cause: intentDigest(configuredRecovery.plan!["founding"].intent), ordinal: 0 }) };
  await recovery.store.save({ ...configuredRecovery, plan: oldPlan });
  expect((await installPlanned(recovery.ctx)).code).toBe(1);
  const attempted = (await recovery.store.config())!.plan!;
  expect(attempted.attempted).toMatch(/^sha256:/);
  expect((await install(recovery.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
  expect((await planInstall(recovery.ctx, SERVICE, { host: "github.com" })).code).toBe(1);
  expect((await recovery.store.config())!.plan).toEqual(attempted);
  expect((await installPlanned(recovery.ctx, { cohort: "file-publication" })).code).toBe(0);
  expect(recovery.bodies).toHaveLength(2);
  expect(recovery.bodies[1]).toBe(recovery.bodies[0]);
  expect((await recovery.store.config())!.plan).toMatchObject({ ...attempted, definition: "platform:register@3", register: oldPlan.register, selected: true });

  for (const { name, definition, other } of COHORTS) {
    const s = scenario();
    await retainedPlan(s, name, { host: "artifacts", namespace: "room" });
    const original = (await s.store.config())!;
    expect([original.plan!.definition, original.plan!.selected, s.bodies]).toEqual([definition, true, []]);
    // Re-read the retained artifacts plan with the same required host. The
    // explicit github.com request below remains the host-mismatch control.
    const same = await command(s.ctx, ["install", "--plan", SERVICE, "--cohort", name, "--host", "artifacts"]);
    expect(same.code, same.lines.join("\n")).toBe(0);
    expect(await s.store.config()).toEqual(original);
    const metrics = s.metrics();
    for (const args of [
      ["install", SERVICE, "--cohort", name, "--host", "github.com"],
      ["install", "--plan", SERVICE, "--cohort", name, "--namespace", "other", "--host", "artifacts"],
      ["install", "https://other.test", "--cohort", name, "--host", "artifacts"],
      ["install", SERVICE, "--cohort", other, "--host", "artifacts"], ["install", "--plan", SERVICE, "--cohort", other, "--host", "artifacts"],
      ["install", "--planned", "--cohort", other],
      ["install", SERVICE, "--host", "artifacts"], ["install", "--plan", SERVICE, "--host", "artifacts"],
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
    await retainedPlan(expired, name, { host: "artifacts", namespace: "room" });
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
      expect(refused.lines[0]).toContain(`For a new plan on ${CREATION_INSTALL_COHORTS.some(current => current === name) ? name : "an admitted cohort"}, set DAP_HOME to a separate empty directory`);
      expect(refused.lines[0]).toContain("If ARTROOM_HOME is set, unset it or set it to that same new directory");
      expect(refused.lines[0]).toContain("different directories refuse before configuration is read");
      expect(refused.lines[0]).not.toContain("Plan again");
      expect([await expired.store.config(), expired.bodies]).toEqual([expiredConfig, []]);
    }
    expect([expired.metrics().saves, expired.metrics().keyWrites]).toEqual([before.saves, before.keyWrites]);
    const separate = scenario();
    separate.ctx.now = expired.ctx.now;
    if (!CREATION_INSTALL_COHORTS.some(current => current === name)) {
      expect((await command(separate.ctx, ["install", "--plan", SERVICE, ...where])).code).toBe(2);
      expect([await separate.store.config(), separate.bodies, separate.metrics()]).toEqual([null, [], { saves: 0, keyReads: 0, keyWrites: 0 }]);
      continue;
    }
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
      await retainedPlan(s, name);
      const first = await install(s.ctx, SERVICE, { host: "github.com", cohort: name }).catch(() => ({ code: 1 }));
      expect(first.code).toBe(1);
      const pending = (await s.store.config())!;
      expect([pending.register, pending.plan?.attempted]).toEqual([undefined, expect.stringMatching(/^sha256:/)]);
      const original = canonicalize(pending.plan!["founding"]);
      // Expiry cannot replace a possibly delivered or acknowledged original.
      s.ctx.now = () => timeMs(pending.plan!["founding"].intent.notAfter)! + 901_000;
      expect((await planInstall(s.ctx, SERVICE, { host: "github.com", cohort: name })).code).toBe(0);
      expect(await s.store.config()).toEqual(pending);
      expect((await install(s.ctx, SERVICE, { host: "github.com", cohort: name })).code).toBe(0);
      const kept = (await s.store.config())!;
      expect([kept.register!.scope, canonicalize(kept.plan!["founding"]), new Set(s.bodies).size]).toEqual([pending.plan!.register, original, 1]);
    }
    // A store that silently drops the attempted marker provides no custody.
    const s = scenario();
    await retainedPlan(s, name);
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
    expect((await install(changed.ctx, SERVICE, { host: "github.com", cohort: "application" })).code).toBe(1);
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
    ["install", SERVICE, "--register-policy", "public", "--host", "github.com"],
    ["install", SERVICE, "--register-policy", "open", "--register-policy", "keys", "--host", "github.com"],
    ["install", SERVICE, "--register-policy", "open", "--cohort", "application", "--host", "github.com"],
  ]) expect((await command(invalid.ctx, args)).code).toBe(2);
  expect([invalid.metrics(), invalid.bodies]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, []]);
  const planned = scenario();
  expect((await command(planned.ctx, ["install", "--plan", SERVICE, "--register-policy", "open", "--host", "artifacts", "--namespace", "dap-demo"])).code).toBe(0);
  const original = (await planned.store.config())!;
  expect(original.plan!.definition).toBe("platform:register@17");
  expect(original.plan!["founding"].intent.fields).toMatchObject({ policy: "open", founders: [original.plan!["founding"].intent.actor] });
  expect(planned.bodies).toEqual([]);
  for (const args of [["install", "--planned", "--register-policy", "keys"], ["install", "--plan", SERVICE, "--register-policy", "keys", "--cohort", "archive-device-application", "--host", "github.com"]]) {
    expect((await command(planned.ctx, args)).code).toBe(1);
    expect(await planned.store.config()).toEqual(original); expect(planned.bodies).toEqual([]);
  }
  expect((await command(planned.ctx, ["install", "--planned"])).code).toBe(0);
  expect(JSON.parse(planned.bodies[0]!).creation).toEqual(original.plan!["founding"]);
  const direct = scenario();
  expect((await command(direct.ctx, ["install", SERVICE, "--register-policy", "open", "--host", "github.com"])).code).toBe(0);
  expect(JSON.parse(direct.bodies[0]!)).toMatchObject({ definition: "platform:register@17", creation: { intent: { fields: { policy: "open" } } } });
  const keys = scenario();
  expect((await command(keys.ctx, ["install", "--plan", SERVICE, "--cohort", "archive-device-application", "--host", "github.com"])).code).toBe(0);
  expect((await keys.store.config())!.plan!["founding"].intent.fields["policy"]).toBe("keys");
  expect((await command(keys.ctx, ["install", "--planned", "--register-policy", "open"])).code).toBe(1);
  expect(keys.bodies).toEqual([]);
});

// These are scripted service answers; Native host admission is witnessed separately.
test("host is required and closed before custody; none selects the exact unpublished open plan and keeps its identity", async () => {
  for (const args of [["install", "--plan", SERVICE], ["install", SERVICE, "--host", "other"], ["install", "--plan", SERVICE, "--host", "none", "--cohort", "archive-device-application"]]) {
    const s = scenario();
    const answer = await command(s.ctx, args);
    expect(answer.code).toBe(2);
    expect(answer.lines.join(" ")).toMatch(/--host|host-unknown/);
    expect([s.metrics(), s.bodies, await s.store.config()]).toEqual([{ saves: 0, keyReads: 0, keyWrites: 0 }, [], null]);
  }
  const s = scenario();
  expect((await command(s.ctx, ["install", "--plan", SERVICE, "--host", "none", "--namespace", "ignored", "--register-policy", "open"])).code).toBe(0);
  const original = (await s.store.config())!.plan!;
  expect(original.definition).toBe(UNPUBLISHED_COHORT.register);
  expect(original["founding"].intent.fields).toMatchObject({ host: "none", namespace: "", policy: "open" });
  expect(s.bodies).toHaveLength(0);
  expect((await command(s.ctx, ["install", "--planned", "--cohort", "unpublished", "--register-policy", "open"])).code).toBe(0);
  const saved = (await s.store.config())!;
  expect(saved.plan!["founding"]).toEqual(original["founding"]);
  expect(saved.register?.scope).toBe(original.register);
  expect(s.bodies).toHaveLength(1);
  expect(JSON.parse(s.bodies[0]!).definition).toBe(UNPUBLISHED_COHORT.register);
});
