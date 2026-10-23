/** Real package signatures, native admission judgments and local R2. The
 * registrar/membership and Git object source are explicit in-memory fixtures.
 * These direct port calls do not show a runtime restart or retry driver. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { clockOf, judgeOutcome } from "@generalbusiness/dap-derive";
import { platform } from "@generalbusiness/dap-platform";
import { keys, membership } from "@generalbusiness/dap-derive/testing";
import { Rulebook } from "../../platform/test/support-rules.ts";
import { APPLICATION_INSTALL_RULES } from "@generalbusiness/dap-platform/application-install";
import { applicationHostOutside } from "../src/applications/wiring.ts";
import { applicationOutside } from "../src/applications/outside.ts";
import { ApplicationContentStore } from "../src/applications/content.ts";
import type { EffectRequest } from "../src/operations.ts";
import { applicationResolverFixture, applicationContentBindings } from "./fixtures-native.ts";

async function fixture(format: "sha1" | "sha256" = "sha1") {
  const f = await applicationResolverFixture(format), r = new Rulebook(true, membership.scope, APPLICATION_INSTALL_RULES);
  const fields = { definitionText0: textDigest(f.packet.package.semantic.definitions[0]!.bytes), uri: f.uri, release: f.packet.ids.release, semantic: f.packet.ids.semantic, roles: [], values: '{"target":7}' };
  const values = [canonicalize(f.packet.package.semantic), canonicalize(f.packet.package.release)];
  const texts = (digest: string) => { const part = f.packet.package.semantic.definitions.find(part => textDigest(part.bytes) === digest); return part ? utf8(part.bytes).length : undefined; };
  const judged = r.act(keys.rita, "install-application", { fields }, { values, texts });
  expect(judged.result, JSON.stringify(judged)).toBe("write");
  const request: EffectRequest = { scope: r.at, owner: APPLICATION_INSTALL_RULES, kind: "fetch-application", operation: `${r.head.seq}:0`, attempt: 1, origin: r.entries[r.head.seq]! };
  let puts = 0;
  const store = new ApplicationContentStore({ get: env.APPLICATION_CONTENT.get.bind(env.APPLICATION_CONTENT), put: async (...args: Parameters<R2Bucket["put"]>) => { puts++; return env.APPLICATION_CONTENT.put(...args); } }, f.trust, PROPOSED_BOUNDS);
  const port = applicationOutside({ trust: f.trust, bounds: PROPOSED_BOUNDS, store, open: f.open });
  const admission = (answer: NonNullable<Awaited<ReturnType<typeof port.send>>>): EffectRequest => {
    const judged = judgeOutcome(r.state, r.definition, { type: "outcome", operation: request.operation, attempt: 1, result: answer.result, evidence: answer.evidence },
      { clock: clockOf(r.state, r.now), bounds: r.bounds, platform: { named: APPLICATION_INSTALL_RULES, rules: platform(APPLICATION_INSTALL_RULES)!.rules }, own: r.own });
    expect(judged.result, JSON.stringify(judged)).toBe("write");
    if (judged.result !== "write") throw Error("TEST native fetch must confirm stored bytes");
    r.seal(judged.draft);
    return { ...request, kind: "admit-application", operation: `${r.head.seq}:0`, origin: r.entries[r.head.seq]! };
  };
  return { f, request, port, admission, puts: () => puts };
}
// Invariant: native admission checks the original immutable path before any
// cache write; the separate admission recovery only reads bytes already stored.
test("admission port confirms exact provenance and recovers cached content without another write", async () => {
  const { f, request, port, admission, puts } = await fixture();
  try {
    expect(await port.recovery!.read(request)).toBeNull();
    expect(puts()).toBe(0); expect(f.opened).toHaveLength(0);
    const answer = await port.send(request);
    expect(answer).toMatchObject({ result: "confirmed", evidence: { basis: "read", body: { uri: f.uri, ...f.packet.ids, publisher: f.packet.package.release.manifest.publisher } } });
    expect(puts()).toBe(1);
    const admitted = admission(answer!);
    const admissionAnswer = await port.send(admitted);
    expect(admissionAnswer).toEqual(answer);
    const freshPort = applicationOutside({ trust: f.trust, bounds: PROPOSED_BOUNDS, store: new ApplicationContentStore({ get: env.APPLICATION_CONTENT.get.bind(env.APPLICATION_CONTENT), put: async () => { throw Error("TEST recovery must never put"); } }, f.trust, PROPOSED_BOUNDS), open: f.open });
    expect(await freshPort.recovery!.read(admitted)).toEqual(admissionAnswer);
    expect(f.opened).toHaveLength(1); expect(f.closed()).toBe(1);
    // Existing cache content does not turn an absent original commit into
    // confirmed provenance. The original entry here is a negative control.
    const changed = structuredClone(request);
    const input = changed.origin.entry.input;
    if (input.type !== "act") throw Error("TEST install act required");
    input.signed.intent.fields["uri"] = f.uri.replace(f.commit, "f".repeat(40));
    expect(await freshPort.hostPreparation!.resume(changed)).toMatchObject({ result: "refused", evidence: { body: { reason: "source-refused" } } });
    expect(puts()).toBe(1);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); }
});

test("admission port records unsupported format without network and leaves transient reads pending", async () => {
  const { f, request, port, puts } = await fixture("sha256");
  expect(await port.send(request)).toMatchObject({ result: "refused", evidence: { basis: "read", body: { uri: f.uri, release: f.packet.ids.release, reason: "unsupported-object-format" } } });
  expect(f.opened).toEqual([]); expect(puts()).toBe(0);
  expect(await port.send({ ...request, owner: "platform:rules@3" })).toBeNull();
  expect(await port.send({ ...request, operation: "0:0" })).toBeNull();
  const sha1 = await fixture();
  try {
    const unavailable = applicationOutside({ trust: sha1.f.trust, bounds: PROPOSED_BOUNDS, store: sha1.f.store, open: async () => { throw Error("TEST private transport detail"); } });
    expect(await unavailable.send(sha1.request)).toBeNull();
    expect(await env.APPLICATION_CONTENT.head(sha1.f.key)).toBeNull();
  } finally { await env.APPLICATION_CONTENT.delete(sha1.f.key); }
});


// Missing or malformed operator configuration must not initiate even the
// bounded public Git transport; a later ordinary install can use fixed config.
test("host wiring refuses absent storage and invalid whole trust settings before network", async () => {
  const { f, request } = await fixture(); let calls = 0;
  const send = async () => { calls++; throw Error("TEST configuration must refuse before transport"); };
  for (const setting of [{ APPLICATION_TRUST: JSON.stringify(f.trust) }, applicationContentBindings(env.APPLICATION_CONTENT, "not JSON")]) {
    const port = applicationHostOutside(setting, PROPOSED_BOUNDS, send);
    expect(await port.send(request)).toMatchObject({ result: "refused", evidence: { basis: "read", body: { reason: "unsupported-host" } } });
  }
  expect(calls).toBe(0);
});
