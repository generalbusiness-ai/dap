/** Real native room scopes, production member authority, SQLite commits,
 * operation driver, eviction/recovery, detached-text transport and local R2.
 * Repository creation, Git objects, clock and read-session inspector are
 * explicit fixtures. This stops before child creation: not a full install. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest } from "@generalbusiness/artroom-bytes";
import { TRUSTED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { applicationOutside } from "../src/applications/outside.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { rita } from "./repository.ts";

test("one signed native install recovers a lost admission answer and hands exact retained declarations to Directory", async () => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room;
  const [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native room must confirm all three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, { member: ["counting.fulfill"] });
  let sends = 0, recoveries = 0;
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    const expected = await life.wait(() => M.expected({ roster: 0, member: seat }));
    await life.wait(() => M.did(rita, "first-key", { fields: { member: seat }, expected }));
    life.wire(A.name, () => {
      const port = applicationOutside({ trust: f.trust, bounds: PROPOSED_BOUNDS, store: f.store, open: f.open });
      return { outside: { accepts: port.accepts,
        send: async request => { sends++; await port.send(request); return null; }, // TEST lost successful answer
        recovery: { accepts: port.recovery!.accepts, read: async request => { recoveries++; return port.recovery!.read(request); } },
      } };
    });
    await life.wait(() => A.restart());
    life.setHold(envelope => envelope.from.at.scope === A.name);
    const declarations = f.packet.package.semantic.definitions;
    const fields = {
      uri: f.uri, release: f.packet.ids.release, semantic: f.packet.ids.semantic, roles: ["member"], values: '{"target":7}',
      ...Object.fromEntries(declarations.map((part, index) => [`definitionText${index}`, textDigest(part.bytes)])),
    };
    const changed = declarations[0]!.bytes.replace('"counting-commitments"', '"TEST changed definition"');
    const refused = await life.wait(() => A.intent(rita, "install-application", { fields: { ...fields, definitionText0: textDigest(changed) } }));
    expect(await life.wait(() => A.stub.submit(refused, [], { values: [canonicalize(f.packet.package.semantic), canonicalize(f.packet.package.release)], texts: [changed] }))).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect(sends).toBe(0); expect(f.opened).toEqual([]);
    const signed = await life.wait(() => A.intent(rita, "install-application", { fields }));
    const answer = await life.wait(() => A.stub.submit(signed, [], { values: [canonicalize(f.packet.package.semantic), canonicalize(f.packet.package.release)], texts: declarations.map(part => part.bytes) }));
    expect(answer).toMatchObject({ answer: "accepted" });
    if (answer.answer !== "accepted") throw Error("Original signed install must be recorded.");
    const job = answer.receipt.fact.seq;
    await effectFixture([A], life.wait);
    expect(sends).toBe(1);
    expect((await life.wait(() => A.item(job))).values["phase"]).toBe("admission");
    expect(await f.store.get(f.packet.ids.release)).toEqual(f.packet);
    await life.wait(() => A.restart());
    life.advance(PROPOSED_BOUNDS.drainRetrySeconds * 1000);
    await effectFixture([A], life.wait);
    expect(sends).toBe(1); expect(recoveries).toBeGreaterThan(0);
    expect((await life.wait(() => A.item(job))).values["phase"]).toBe("activation");
    const declared = (node: typeof A, digest: Digest) => life.wait(() => (node.object as unknown as { declared(digest: Digest): Promise<string | null> }).declared(digest));
    expect(await declared(A, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    // Native declaration custody is independent of the screen/content cache.
    await env.APPLICATION_CONTENT.delete(f.key);
    life.setHold(() => false);
    life.advance(PROPOSED_BOUNDS.drainRetrySeconds * 1000);
    await dispatchFixture([R, D, M, A, G], life.wait);
    expect((await life.wait(() => A.item(job))).values["phase"]).toBe("creation");
    expect((await life.wait(() => M.item(0))).values["memberActions"]).toContain("counting.fulfill");
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    await life.wait(() => D.restart());
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    const history = await life.wait(() => A.entries());
    const original = history.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application");
    expect(original).toHaveLength(1);
    expect(original[0]!.input).toMatchObject({ type: "act", signed });
    expect(history.filter(entry => entry.input.type === "outcome")).toHaveLength(1);
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);
