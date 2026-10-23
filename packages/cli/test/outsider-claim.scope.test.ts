/** Real CLI, public Register17 projection, native judgments and HTTP reads.
 * Git repository replies, clock and dispatch scheduling are explicit stand-ins.
 * No hosted API, deployed Artifacts binding or MCP service runs. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { b64url, canonicalize } from "@generalbusiness/dap-bytes";
import type { Digest, OperationId, Read } from "@generalbusiness/dap-contract";
import type { Item } from "@generalbusiness/dap-derive";
import type { Fetch } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, repositoryName } from "@generalbusiness/dap-platform";
import { demoCreationRoute } from "../../../apps/room/demo-creation.ts";
import type { Binding } from "../../scope/src/namespace.ts";
import { beginSessionFixture } from "../../scope/test/session-settings.ts";
import { nativeFixtureLifetime, driveFixture } from "../../scope/test/support/native-fixture-lifetime.ts";
import { reader as inspector } from "../../scope/test/support.ts";
import { routed, sam } from "../../scope/test/repository.ts";
import { outsideOf } from "../../scope/test/outside.ts";
import { command, memoryStore, type Context } from "../src/index.ts";
const SERVICE = "https://dap-demo.inguz.workers.dev";

test("dedicated public offer lets an outsider claim Register17 without a member register read; keys still refuses", async () => {
  const life = nativeFixtureLifetime(beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector }));
  try {
    for (const policy of ["open", "keys"] as const) {
      let register: ReturnType<typeof life.platform> | undefined;
      let summaryReads = 0, offers = 0;
      const rawFetch = async (url: string, init?: Parameters<Fetch>[1]): Promise<Awaited<ReturnType<Fetch>> & { url?: string; redirected?: boolean }> => {
        const endpoint = new URL(url);
        if (register && endpoint.pathname === `/v1/scopes/${register.name}` && (init?.method ?? "GET") === "GET") {
          summaryReads++; return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
        }
        if (endpoint.pathname === "/v1/demo/creation-offer") {
          offers++;
          expect(endpoint.origin).toBe(SERVICE);
          expect(init?.method).toBe("GET");
          // Match the maintained startup fixture: direct Worker dispatch is
          // not a fetch redirect implementation. The production client asks
          // fetch to reject redirects; this adapter never follows one.
          expect(Reflect.get(init!, "redirect")).toBe("error");
          const response = await life.wait(() => demoCreationRoute(new Request(url, { ...init, redirect: "manual" }), {
            SCOPES: env.PLATFORM as unknown as Binding, DEPLOYMENT: "TEST outsider demo",
            ARTIFACTS_NAMESPACE: "outsider-fixture", ARTIFACTS_CONFIG: canonicalize({ registerScope: register!.name, namespace: "outsider-fixture", host: "service.invalid", maxBytes: 10485760, credentialIdentity: "adapter-attempt" }),
            DEMO_START_CONFIG: canonicalize({ v: 3, origin: SERVICE, deployment: "TEST outsider demo", register: { scope: register!.name, kind: "register", inc: current!.inc }, definition: C.register }),
          }));
          // Exact local playback metadata, as serving-startup.scope.test.ts.
          // The body/status remain those of the actual route and Native offer.
          return { status: response.status, body: response.body, url, redirected: false };
        }
        return life.wait(() => routed(url, init));
      };
      const fetch: Fetch = rawFetch;
      const installer: Context = { store: memoryStore(), fetch, now: life.now, trustedCreationService: { service: SERVICE, fetch } };
      const installed = await life.wait(() => command(installer, ["install", SERVICE, "--register-policy", policy, "--cohort", "archive-device-application", "--host", "artifacts", "--namespace", "outsider-fixture"]));
      expect(installed.code, installed.lines.join("\n")).toBe(0);
      const config = (await installer.store.config())!;
      register = life.platform(config.register!.scope);
      const current = await life.wait(() => register!.at());
      expect(config.register).toEqual(current);
      life.wire(register.name, () => ({ outside: outsideOf(register!.name) }));
      await life.wait(() => register!.restart());
      const visitor = memoryStore(); await visitor.keep("visitor", sam.secret);
      await visitor.save({ v: 1, service: SERVICE, key: "visitor", register: current });
      expect((await installer.store.secret(config.key))!).not.toEqual(sam.secret);
      const pause: NonNullable<Context["pause"]> = async waiting => {
        life.active();
        const final = await life.wait(() => (register!.stub as unknown as { items(reader: unknown, type: string): Promise<Read<readonly Item[]>> }).items(inspector, "claim"));
        const rows = (await life.wait(() => register!.summary())).value.items.filter(item => item.type === "claim");
        for (const item of rows.concat(final.ok ? final.value : [])) {
          const name = repositoryName(item.values["seed"] as Digest, 1);
          outsideOf(register!.name).answer(`${item.id}:0` as OperationId, 1, { result: "confirmed", evidence: { basis: "own-answer", body: { name, id: "TEST outsider repository" } } });
        }
        await driveFixture([register!, ...waiting.map(scope => life.platform(scope as never))], life.wait);
      };
      if (policy === "keys") {
        const found = await life.wait(() => register!.intent(sam, "found", { expected: { register: 1 }, fields: { branch: "main", founderHandle: "@visitor", recoveryKey: sam.key } }));
        expect(await life.wait(() => register!.stub.submit(found, []))).toMatchObject({ answer: "refused", reason: "unauthorized" });
        const refused = await life.wait(() => command({ store: visitor, fetch, now: life.now, pause, tries: 3 }, ["claim", "visitor", "--handle", "@visitor"]));
        expect(refused.code).toBe(1);expect((await visitor.config())!.claim).toBeUndefined();
        expect(await visitor.secret("recovery")).toBeNull();
      } else {
        const result = await life.wait(() => command({ store: visitor, fetch, now: life.now, pause, tries: 5 }, ["claim", "visitor", "--handle", "@visitor"]));
        expect(result.code, result.lines.join("\n")).toBe(0);
        const kept = (await visitor.config())!, repository = kept.repository!;
        expect(repository).toBeDefined();expect(kept.handle).toBe("@visitor");
        const directory = await life.wait(() => life.platform(repository.directory.scope).summary());
        expect(directory.value.definition).toBe(C.directory);
        for (const [name, pin] of [[repository.membership.scope,C.membership],[repository.rules,C.rules],[repository.destination,C.destination],[repository.inbox!,C.inbox]] as const) {
          expect((await life.wait(() => life.platform(name).summary())).value.definition).toBe(pin);
        }
        expect(JSON.stringify(kept)).not.toContain(b64url(sam.secret));
      }
      if (policy === "open") {
        // The injected port owns a body until strict fetch metadata is checked.
        // No read/recovery signer/claim may survive this preflight refusal.
        const malformedStore = memoryStore();await malformedStore.keep("visitor",sam.secret);
        await malformedStore.save({v:1,service:SERVICE,key:"visitor",register:current});
        let canceled=0,read=0;
        const malformedFetch: Fetch = async () => ({status:200,body:{getReader:()=>({
          read:async()=>{read++;return {done:true as const,value:undefined};},
          cancel:async()=>{canceled++;},
        })}});
        const malformed=await life.wait(()=>command({store:malformedStore,fetch:malformedFetch,now:life.now},["claim","metadata-refusal","--handle","@visitor"]));
        expect(malformed.code).toBe(1);expect(malformed.lines.join(" ")).toContain("The same-origin creation offer is unavailable or invalid. No claim was submitted.");
        expect([canceled,read]).toEqual([1,0]);expect(await malformedStore.secret("recovery")).toBeNull();expect((await malformedStore.config())!.claim).toBeUndefined();
      }
      expect(offers).toBeGreaterThan(0);expect(summaryReads).toBe(0);
    }
  } finally { life.release(); }
}, 30_000);
