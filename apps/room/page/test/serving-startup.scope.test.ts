/** Actual Page Start/open/first Issues data flow through production HTTP and
 * Native web cohort. No DOM/browser/deployment runs. Provider, scheduler,
 * storage, single-task lock and response URL metadata remain named fixtures. */
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Seed, ScopeId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, intentDigest, scopeIdOf } from "@generalbusiness/dap-bytes";
import { creationOffer, secretSigner, signedIntent, type CreationOfferFetch, type Fetch, type Signer } from "@generalbusiness/dap-client";
import { DEMO_PURPOSE, WEB_DEMO_REGISTER, WEB_DEMO_COHORT } from "@generalbusiness/dap-platform";
import worker from "../../worker.ts";
import { startRoom } from "../src/start-custody.ts";
import { memoryPageKeys } from "./private-key-fixture.ts";
import { allowedClaim } from "../src/claim.ts";
import { actsOn, initializationStillCurrent, listLanes, openRoom, roomInitialization } from "../src/data.ts";
import { beginSessionFixture } from "../../../../packages/scope/test/session-settings.ts";
import { driveFixture, nativeFixtureLifetime } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { ownHost } from "../../../../packages/scope/test/hosts.ts";
import { reader } from "../../../../packages/scope/test/support.ts";
import { TEST_DEPLOYMENT, type PlatformScope } from "../../../../packages/scope/test/worker.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexPort } from "../../../../packages/scope/src/scope-index.ts";
import { DEFAULT_SERVING_LIMITS } from "../../../../packages/scope/src/serving-limits.ts";
import { startupTest, StartupOwner, StartupReadTrace, startupScopes, startupSnapshot, startupReport, type StartupServingIndex } from "../../../../packages/scope/test/support/serving-startup.ts";

test("R12 default-limit Page Start, open and initial Issues data view count actual Signed admissions separately from sessions", async context => {
  expect(startupTest.index).toBeNull();
  const owned = new StartupOwner(env.STARTUP_INDEX);
  let enrolled: Signer | undefined;
  let failed = false;
  try { await owned.run(async () => {
    const index = env.STARTUP_INDEX.get(env.STARTUP_INDEX.idFromName(SCOPE_INDEX_NAME));
    const port = index as unknown as ScopeIndexPort;
    // Activate without admission or index writes before the initial cold reset.
    await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    await evictDurableObject(index);
    owned.assertOpen();
    const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
    const life = nativeFixtureLifetime(owner, { finish: "external" });
    owned.attach(life, () => { enrolled = undefined; });
    // Real nonextractable WebCrypto keys; record storage and locks are the
    // existing in-memory fixture, not browser IndexedDB durability proof.
    const keys = memoryPageKeys();
    const wait = <T>(action: () => Promise<T>) => owned.wait(() => life.wait(action));
    const origin = "https://artroom-rehearsal.inguz.workers.dev", host = ownHost();
    const installer = secretSigner(crypto.getRandomValues(new Uint8Array(32)));
    const install = await signedIntent(installer, { to: null, kind: "install", fields: { host: host.host, namespace: host.namespace, policy: "open", purpose: DEMO_PURPOSE } }, { now: life.now() });
    const seed: Seed = { v: 1, kind: "register", definition: WEB_DEMO_REGISTER, creator: null, cause: intentDigest(install.intent), ordinal: 0 };
    const R = life.platform(scopeIdOf(seed));
    const wire = (name: ScopeId) => { life.platform(name); life.outside(name, (given, sql) => host.outside(given, sql, host.bindings(R.name))); };
    wire(R.name);
    expect((await wait(() => R.stub.create(install, WEB_DEMO_REGISTER))).answer).toBe("accepted");
    await wait(() => R.restart());
    const register = await wait(() => R.at());
    life.setHold(envelope => { if ("definition" in envelope.to) wire(scopeIdOf(envelope.to)); return false; });
    await wait(() => runInDurableObject(env.PLATFORM.get(env.PLATFORM.idFromName(register.scope)), instance => (instance as PlatformScope).awaitScheduledCallbacks()));
    expect(await port.has(register.scope, "register")).toBe(true); // genuine native registration, not a test row
    const setup = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    await evictDurableObject(index); // reset only serving memory; keep the actual known_scope row
    expect(await port.has(register.scope, "register")).toBe(true);
    const before = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    expect(before.instance).not.toBe(setup.instance);
    const reads = new StartupReadTrace();
    const bindings = { SCOPE_INDEX: env.STARTUP_INDEX, SCOPES: startupScopes(env.PLATFORM, reads), DEPLOYMENT: TEST_DEPLOYMENT,
      DEMO_START_CONFIG: canonicalize({ v: 2, origin, deployment: TEST_DEPLOYMENT, register, definition: WEB_DEMO_REGISTER }) };
    const native: Fetch = (url, init) => wait(() => worker.fetch(new Request(url, init), bindings));
    const offerFetch: CreationOfferFetch = async (url, init) => {
      expect(init.redirect).toBe("error");
      const response = await wait(() => worker.fetch(new Request(url, { ...init, redirect: "manual" }), bindings));
      return { status: response.status, url, redirected: false, body: response.body };
    };
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, bytes: string) => { values.set(key, bytes); } };
    const pause = (waiting: readonly ScopeId[] = []) => driveFixture([R, ...waiting.filter(name => name !== R.name).map(name => life.platform(name))], wait);
    const offer = await wait(() => creationOffer(origin, { fetch: offerFetch }));
    const result = await wait(() => startRoom(origin, storage, { mode: "new", label: "R12 startup",
      offer, keys,
      creationOffer: register => creationOffer(origin, { fetch: offerFetch, ...(register ? { register } : {}) }),
      fetch: native, now: life.now, pause, tries: 16, locks: { request: async (_name, run) => run() } }));
    expect([result.pending, result.outcome.code], result.outcome.lines.join("\n")).toEqual([false, 0]);
    if (!result.repository || !result.signer) throw Error("Actual enrolled Page creator required");
    enrolled = result.signer;
    const session = { service: origin, signer: enrolled, fetch: native, now: life.now };
    const place = { directory: result.repository.directory.scope, membership: result.repository.membership };
    // main.ts showResult verifies once, then Open clears its room cache and
    // draw opens again. Include both real calls, not just the cheaper second half.
    const verified = await wait(() => openRoom(session, place));
    expect([verified.key, verified.me?.handle]).toEqual([result.key, result.handle]);
    const room = await wait(() => openRoom(session, place));
    // Browser draw with a retained register and Web Locks performs this
    // eligibility read before the initial view. The fixture's lock is named above.
    expect((await wait(() => allowedClaim(session, register))).register).toEqual(register);
    // The same native data functions/order used by main.ts initial Issues draw;
    // panelFor receives this offered result and adds no further initial read.
    const initialization = await wait(() => roomInitialization(room));
    await wait(() => listLanes(room));
    await wait(() => actsOn(room, room.directory));
    if (initialization.state === "not-initialized") expect(await wait(() => initializationStillCurrent(room, initialization))).toBe(true);
    await owned.quiesce(); // actual phase promises and registered native callbacks precede AFTER
    const after = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    const report = startupReport(before, after, reads.snapshot());
    // Cohort inspection is a separate fixture observation, outside measured caller requests.
    const cohort = {
      register: (await wait(() => R.summary())).value.definition,
      directory: room.directoryIndex?.definition,
      membership: (await wait(() => life.platform(result.repository!.membership.scope).summary())).value.definition,
      rules: (await wait(() => life.platform(room.rules).summary())).value.definition,
      destination: (await wait(() => life.platform(room.destination).summary())).value.definition,
    };
    const actual = { ...report, setup, path: "Page Start/open/initial Issues data flow", cohort, transportAddress: null,
      qualification: report.qualification + " No browser/DOM/provider/deployment. Native setup and post-phase cohort inspection are separate. Single-task locks/storage and URL metadata are fixture adapters." };
    console.info("R12 default startup", JSON.stringify(actual));
    (context.task.meta as Record<string, unknown>)["r12Startup"] = actual;
    expect(cohort).toEqual(WEB_DEMO_COHORT);
    expect([report.complete, report.requiresDefaultAdjustment, after.defaults, reads.calls > 0])
      .toEqual([true, false, DEFAULT_SERVING_LIMITS, true]);
    expect(after.counts.some(row => row.by === "address")).toBe(false);
  }); } catch (error) { failed = true; throw error; }
  finally {
    try { await owned.finish(); }
    catch (error) { if (!failed) throw error; console.error("R12 startup cleanup incomplete; original failure retained and ownership not reset"); }
  }
});
