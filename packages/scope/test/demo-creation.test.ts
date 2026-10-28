/** Real native register judgments/SQLite/RPC with the fixture clock. No provider,
 * repository creation, directory/enrollment completion, production credentials, browser or hosted admission runs here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { b64url, canonicalize, intentDigest, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent } from "@generalbusiness/dap-client";
import { DEMO_PURPOSE, DEMO_REGISTER, WEB_DEMO_REGISTER, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import type { Seed } from "@generalbusiness/dap-contract";
import type { Binding } from "../src/namespace.ts";
import { demoCreationConfig, demoCreationRoute, type DemoCreationOffer } from "../../../apps/room/demo-creation.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { nativeFixtureLifetime, reader } from "./fixtures-native.ts";
import { routed } from "./repository.ts";

test("Register17 offer exposes only its configured Artifacts register and admits a previously unseen founding key without changing protected reads or waking parked work", async () => {
  const owner=beginSessionFixture({secret:b64url(crypto.getRandomValues(new Uint8Array(32))),sessions:true,inspector:reader});
  const lifetime=nativeFixtureLifetime(owner);
  try {
    const installer=secretSigner(crypto.getRandomValues(new Uint8Array(32))), newcomer=secretSigner(crypto.getRandomValues(new Uint8Array(32)));
    const install=await signedIntent(installer,{to:null,kind:"install",fields:{host:"artifacts",namespace:"dap-demo",policy:"open"}},{now:lifetime.now()});
    const seed:Seed={v:1,kind:"register",definition:ARCHIVE_DEVICE_APPLICATION_COHORT.register,creator:null,cause:intentDigest(install.intent),ordinal:0};
    const register=lifetime.platform(scopeIdOf(seed));
    // Park create-repository rather than sending any provider request.
    lifetime.outside(register.name,()=>({accepts:()=>false,send:async()=>null}));
    expect((await lifetime.wait(()=>register.stub.create(install,ARCHIVE_DEVICE_APPLICATION_COHORT.register))).answer).toBe("accepted");
    const at=await lifetime.wait(()=>register.at()), origin="https://dap-demo.inguz.workers.dev";
    const deployment="TEST demo runtime identity", config={v:3 as const,origin,deployment,register:at,definition:ARCHIVE_DEVICE_APPLICATION_COHORT.register};
    const lookups = { id: 0, get: 0 };
    const observed = { idFromName: (name: string) => { lookups.id++; return env.PLATFORM.idFromName(name); }, get: (id: DurableObjectId) => { lookups.get++; return env.PLATFORM.get(id); } } as unknown as Binding;
    const bindings={DEPLOYMENT:deployment,SCOPES:observed,DEMO_START_CONFIG:canonicalize(config),ARTIFACTS_NAMESPACE:"dap-demo",
      ARTIFACTS_CONFIG:canonicalize({registerScope:at.scope,namespace:"dap-demo",host:"service.invalid",maxBytes:1024,credentialIdentity:"adapter-attempt"})};
    const get=()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"),bindings);
    expect((await lifetime.wait(()=>routed(`https://scopes.test/v1/scopes/${at.scope}`))).status).toBe(403);
    const first=await lifetime.wait(get), offer=await first.json() as DemoCreationOffer;
    expect((await lifetime.wait(()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"),{...bindings,DEPLOYMENT:"TEST unrelated runtime"}))).status).toBe(404);
    const beforeInvalidDeployment = { ...lookups };
    for (const invalid of ["", "a".repeat(129), "界".repeat(43)]) {
      const settings = { ...bindings, DEPLOYMENT: invalid, DEMO_START_CONFIG: canonicalize({ ...config, deployment: invalid }) };
      expect(demoCreationConfig(settings.DEMO_START_CONFIG, invalid, settings)).toBeNull();
      expect((await lifetime.wait(() => demoCreationRoute(new Request(origin + "/v1/demo/creation-offer"), settings))).status).toBe(404);
    }
    expect(lookups).toEqual(beforeInvalidDeployment);
    for (const valid of ["a".repeat(128), "界".repeat(42) + "aa"]) expect(demoCreationConfig(canonicalize({ ...config, deployment: valid }), valid, bindings)).not.toBeNull();
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect([first.status,offer]).toEqual([200,{v:2,origin,register:at,definition:ARCHIVE_DEVICE_APPLICATION_COHORT.register,at:{seq:0,hash:(await lifetime.wait(()=>register.summary())).at.hash},registerItem:{id:0,revision:1,state:"open",host:"artifacts",namespace:"dap-demo",policy:"open"}}]);
    // The same actual Register17 projection follows an explicit second
    // HTTPS identity; the former fixed public origin grants nothing by itself.
    const otherOrigin = "https://offer.test";
    const otherBindings = { ...bindings, DEMO_START_CONFIG: canonicalize({ ...config, origin: otherOrigin }) };
    const otherOffer = await lifetime.wait(() => demoCreationRoute(new Request(otherOrigin + "/v1/demo/creation-offer"), otherBindings));
    expect([otherOffer.status, await otherOffer.json()]).toEqual([200, { ...offer, origin: otherOrigin }]);
    // Rewritten Requests expose only the Worker boundary, not a real proxy.
    const internal = "http://celld.internal:8787/v1/demo/creation-offer";
    const proxyOffer = await lifetime.wait(() => demoCreationRoute(new Request(internal, { headers: { host: "different-host.example" } }), { ...bindings, PUBLIC_ORIGIN: origin }));
    expect([proxyOffer.status, await proxyOffer.json()]).toEqual([200, offer]);
    const otherProxyOffer = await lifetime.wait(() => demoCreationRoute(new Request(internal, { headers: { host: "another-host.example" } }), { ...otherBindings, PUBLIC_ORIGIN: otherOrigin }));
    expect([otherProxyOffer.status, await otherProxyOffer.json()]).toEqual([200, { ...offer, origin: otherOrigin }]);

    const beforeOriginRefusal = { ...lookups };
    for (const settings of [bindings, { ...bindings, PUBLIC_ORIGIN: origin + "/" }]) {
      const response = await lifetime.wait(() => demoCreationRoute(new Request(internal, { headers: { forwarded: "proto=https;host=dap-demo.inguz.workers.dev", "x-forwarded-proto": "https", "x-forwarded-host": "dap-demo.inguz.workers.dev" } }), settings));
      expect([response.status, await response.json()]).toEqual([404, { error: "not-found" }]);
    }
    // Wrong public identity, malformed explicit identity and forwarding alone
    // all close before any namespace lookup, even with valid native state.
    for (const [address, settings, headers] of [
      [origin + "/v1/demo/creation-offer", otherBindings, {}],
      [internal, { ...otherBindings, PUBLIC_ORIGIN: otherOrigin + "/" }, {}],
      [internal, otherBindings, { forwarded: "proto=https;host=offer.test", "x-forwarded-proto": "https", "x-forwarded-host": "offer.test" }],
    ] as const) {
      const response = await lifetime.wait(() => demoCreationRoute(new Request(address, { headers }), settings));
      expect([response.status, await response.json()]).toEqual([404, { error: "not-found" }]);
    }
    expect(lookups).toEqual(beforeOriginRefusal);
    expect(JSON.stringify(offer)).not.toContain(newcomer.key);
    // Native found is the judgment; the anonymous offer grants no authority.
    const matched=await signedIntent(newcomer,{to:at,kind:"found",expected:{register:offer.registerItem.revision},fields:{branch:"main","founderHandle":"@newcomer",recoveryKey:installer.key}},{now:lifetime.now()});
    const answer=await lifetime.wait(()=>register.stub.submit(matched,[]));
    expect(answer.answer).toBe("accepted");
    if(answer.answer!=="accepted")throw Error("Native demo admission failed");
    // The new pin does not relax an existing keys-only register.
    const oldInstall=await signedIntent(installer,{to:null,kind:"install",fields:{host:"github.com",namespace:"generalbusiness-ai",policy:"keys","founders":[installer.key]}},{now:lifetime.now()});
    const oldSeed:Seed={v:1,kind:"register",definition:"platform:register@3",creator:null,cause:intentDigest(oldInstall.intent),ordinal:0};
    const old=lifetime.platform(scopeIdOf(oldSeed));lifetime.outside(old.name,()=>({accepts:()=>false,send:async()=>null}));
    expect((await lifetime.wait(()=>old.stub.create(oldInstall,"platform:register@3"))).answer).toBe("accepted");
    const oldAt=await lifetime.wait(()=>old.at());
    const forbidden=await signedIntent(newcomer,{to:oldAt,kind:"found",expected:{register:1},fields:{branch:"main","founderHandle":"@newcomer",recoveryKey:installer.key}},{now:lifetime.now()});
    expect(await lifetime.wait(()=>old.stub.submit(forbidden,[]))).toMatchObject({answer:"refused",reason:"unauthorized"});
    // Actual old registers still exist, but neither a fresh request nor an
    // exact retained reference can revive the retired server decoder.
    const retiredOrigin = "https://artroom-scope.inguz.workers.dev";
    const retiredCalls = { idFromName: 0, get: 0 };
    const retiredScopes = { idFromName(name: string) { retiredCalls.idFromName++; return env.PLATFORM.idFromName(name); },
      get(id: Parameters<typeof env.PLATFORM.get>[0]) { retiredCalls.get++; return env.PLATFORM.get(id); } } as unknown as Binding;
    let retained7: typeof at | undefined;
    for (const definition of [DEMO_REGISTER, WEB_DEMO_REGISTER] as const) {
      const legacyInstall = await signedIntent(installer, { to: null, kind: "install", fields: {
        host: "github.com", namespace: "generalbusiness-ai", policy: "open", purpose: DEMO_PURPOSE,
      } }, { now: lifetime.now() });
      const legacySeed: Seed = { v: 1, kind: "register", definition, creator: null, cause: intentDigest(legacyInstall.intent), ordinal: 0 };
      const legacy = lifetime.platform(scopeIdOf(legacySeed));
      lifetime.outside(legacy.name, () => ({ accepts: () => false, send: async () => null }));
      expect((await lifetime.wait(() => legacy.stub.create(legacyInstall, definition))).answer).toBe("accepted");
      const legacyAt = await lifetime.wait(() => legacy.at());
      if (definition === DEMO_REGISTER) retained7 = legacyAt;
      const legacyConfig = { v: definition === DEMO_REGISTER ? 1 : 2, origin: retiredOrigin, deployment, register: legacyAt, definition,
        ...(definition === WEB_DEMO_REGISTER ? { legacy: { register: retained7!, definition: DEMO_REGISTER } } : {}) };
      const retired = { ...bindings, SCOPES: retiredScopes, DEMO_START_CONFIG: canonicalize(legacyConfig) };
      const beforeRetired = { ...retiredCalls };
      const freshRetired = await lifetime.wait(() => demoCreationRoute(new Request(retiredOrigin + "/v1/demo/creation-offer"), retired));
      expect([freshRetired.status, await freshRetired.json()]).toEqual([404, { error: "not-found" }]);
      expect(retiredCalls).toEqual(beforeRetired);
      for (const selected of definition === DEMO_REGISTER ? [legacyAt] : [legacyAt, retained7!]) {
        const beforeSelected = { ...retiredCalls };
        const response = await lifetime.wait(() => demoCreationRoute(new Request(`${retiredOrigin}/v1/demo/creation-offer?register=${selected.scope}&inc=${selected.inc}`), retired));
        expect([response.status, await response.json()]).toEqual([404, { error: "not-found" }]);
        expect(retiredCalls).toEqual(beforeSelected);
      }
      const beforeWrong = { ...retiredCalls };
      expect((await lifetime.wait(() => demoCreationRoute(new Request(`${retiredOrigin}/v1/demo/creation-offer?register=${legacyAt.scope}&inc=${newIncarnation(new Uint8Array(16).fill(12))}`), retired))).status).toBe(404);
      expect(retiredCalls).toEqual(beforeWrong);
    }
    // Public discovery never falls back to deployed Register7/8 settings.
    const unchanged = { ...lookups };
    for (const [v, definition] of [[1, "platform:register@7"], [2, "platform:register@8"]] as const) {
      const retired = { ...bindings, DEMO_START_CONFIG: canonicalize({ ...config, v, definition }) };
      expect((await lifetime.wait(() => demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"), retired))).status).toBe(404);
    }
    expect(lookups).toEqual(unchanged);
    const secondInstall=await signedIntent(installer,{to:null,kind:"install",fields:{host:"artifacts",namespace:"dap-demo",policy:"open"}},{now:lifetime.now()});
    const secondSeed:Seed={v:1,kind:"register",definition:ARCHIVE_DEVICE_APPLICATION_COHORT.register,creator:null,cause:intentDigest(secondInstall.intent),ordinal:0};
    const second=lifetime.platform(scopeIdOf(secondSeed));
    expect((await lifetime.wait(()=>second.stub.create(secondInstall,ARCHIVE_DEVICE_APPLICATION_COHORT.register))).answer).toBe("accepted");
    const secondAt=await lifetime.wait(()=>second.at());
    expect(secondAt.scope).not.toBe(at.scope);
    // This exact oracle distinguishes omission of the adapter-register binding.
    expect((await lifetime.wait(()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"),{...bindings,DEMO_START_CONFIG:canonicalize({...config,register:secondAt})}))).status).toBe(404);
    expect(lookups).toEqual(unchanged);
    for(const query of [`?register=${secondAt.scope}&inc=${secondAt.inc}`,`?register=${at.scope}&inc=${newIncarnation(new Uint8Array(16).fill(12))}`,`?register=${at.scope}&inc=${at.inc}&register=${secondAt.scope}`,`?register=${at.scope}`,`?register=${at.scope}&inc=${at.inc}&scope=${at.scope}`]) expect((await lifetime.wait(()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"+query),bindings))).status).toBe(404);
    expect(lookups).toEqual(unchanged); // request ref mismatches refuse before lookup
    expect(demoCreationConfig(canonicalize({...config,legacy:{register:secondAt,definition:DEMO_REGISTER}}),deployment,bindings)).toBeNull();
    expect(demoCreationConfig(canonicalize({...config,origin:"https://foreign.invalid"}),deployment,bindings)).toMatchObject({ current: { origin: "https://foreign.invalid" } });
    const { origin: _origin, ...withoutOrigin } = config;
    for (const invalidConfig of [withoutOrigin, { ...config, origin: otherOrigin + "/path" }]) {
      const settings = { ...bindings, DEMO_START_CONFIG: canonicalize(invalidConfig) };
      expect(demoCreationConfig(settings.DEMO_START_CONFIG, deployment, settings)).toBeNull();
      expect((await lifetime.wait(() => demoCreationRoute(new Request(origin + "/v1/demo/creation-offer"), settings))).status).toBe(404);
    }
    expect(lookups).toEqual(unchanged);
    expect(demoCreationConfig(canonicalize(config),deployment,{...bindings,ARTIFACTS_NAMESPACE:"wrong"})).toBeNull();
    let calls=0;
    lifetime.outside(register.name,()=>({accepts:()=>true,send:async()=>{calls++;return null;}}));
    await lifetime.wait(()=>register.restart());
    const after=await lifetime.wait(get), projection=await after.json() as DemoCreationOffer;
    expect([after.status,projection.at,calls]).toEqual([200,{seq:1,hash:answer.receipt.fact.hash},0]);
    expect(Object.keys(projection).sort()).toEqual(["at","definition","origin","register","registerItem","v"]);
    expect(JSON.stringify(projection)).not.toContain(newcomer.key);
    const wrong={...bindings,DEMO_START_CONFIG:canonicalize({...config,register:{...at,inc:newIncarnation(new Uint8Array(16).fill(11))}})};
    // Config has the right scope but wrong inc: one native read rejects actual-state mismatch.
    const beforeInc = { ...lookups };
    expect((await lifetime.wait(()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer"),wrong))).status).toBe(404);
    expect(lookups).toEqual({ id: beforeInc.id + 1, get: beforeInc.get + 1 });
    expect((await lifetime.wait(()=>demoCreationRoute(new Request("https://dap.generalbusiness.ai/v1/demo/creation-offer"),bindings))).status).toBe(404);
    expect((await lifetime.wait(()=>demoCreationRoute(new Request(origin+"/v1/demo/creation-offer?scope="+at.scope),bindings))).status).toBe(404);
    expect(demoCreationConfig(canonicalize({...config,definition:"platform:register@3"}),deployment)).toBeNull();
  } finally {lifetime.release();}
});
