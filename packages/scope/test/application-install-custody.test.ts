/** Real native room scopes, production member authority, SQLite commits,
 * operation driver, eviction/recovery, detached-text transport and local R2.
 * Repository creation, Git objects, clock and read-session inspector are
 * explicit fixtures. Native births and Lending publication admission are real; no screen or hosted route
 * is exercised here. */
import type { Fetched } from "@generalbusiness/dap-derive";
import type { Sourced } from "../src/namespace.ts";
import { lending } from "../../../examples/lending/definition.ts";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, isSeed, parseStrict, scopeIdOf, textDigest } from "@generalbusiness/artroom-bytes";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import { TRUSTED_APPLICATION_COHORT as C, applicationPublicationOrigin, installedApplicationPublicationOrigin, platform } from "@generalbusiness/dap-platform";
import { applicationAnnouncementOutside } from "../src/applications/announce.ts";
import { applicationOutside } from "../src/applications/outside.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { reader } from "./support.ts";
import { rita, sam, routed } from "./repository.ts";

const installations = [
  { name: "Counter", declaration: countingCommitments, roles: { admin: ["counting.control"], member: ["counting.fulfill"] }, values: '{"target":7}' },
  { name: "Lending", declaration: lending, roles: { admin: ["lending.member", "lending.staff"], member: ["lending.member"] }, values: '{}' },
] as const;
test.each(installations)("$name: one signed native install recovers admission and creates its native application through Directory", async specimen => {
  const room = await sessionRoom(C.register), { life, R, D, children } = room;
  const [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native room must confirm all three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, specimen.roles, specimen.declaration);
  let sends = 0, recoveries = 0;
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    const expected = await life.wait(() => M.expected({ roster: 0, member: seat }));
    await life.wait(() => M.did(rita, "first-key", { fields: { member: seat }, expected }));
    life.outside(D.name, given => applicationAnnouncementOutside(given));
    await life.wait(() => D.restart());
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
      uri: f.uri, release: f.packet.ids.release, semantic: f.packet.ids.semantic, roles: ["admin", "member"], values: specimen.values,
      ...Object.fromEntries(declarations.map((part, index) => [`definitionText${index}`, textDigest(part.bytes)])),
    };
    const changed = declarations[0]!.bytes + "\n";
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
    const creation = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => send.message.class === "request" && send.message.type === "create" && isSeed(send.to) && send.to.kind === "lane");
    if (!creation || !isSeed(creation.to)) throw Error("Directory must record the actual child creation.");
    const C = life.platform(scopeIdOf(creation.to));
    await driveFixture([R, D, M, A, G, C], life.wait);
    expect((await life.wait(() => C.summary())).value).toMatchObject({ status: "active", definition: f.packet.package.semantic.entry });
    const completed = await life.wait(() => A.item(job));
    expect(completed).toMatchObject({ state: "active", refs: { scope: await life.wait(() => C.at()) } });
    if (specimen.name === "Counter") {
      const configuration = await life.wait(() => C.expected({ configuration: 0 }));
      expect(await life.wait(() => C.act(sam, "initialize", { expected: configuration }))).toMatchObject({ answer: "refused" });
      await life.wait(() => C.did(rita, "initialize", { expected: configuration }));
      expect((await life.wait(() => C.summary())).value.items.find(item => item.type === "board")).toMatchObject({ state: "paused", values: { target: 7 } });
    } else {
      expect((await life.wait(() => C.item(0))).refs["destination"]).toEqual(await life.wait(() => G.at()));
      const donation = { expected: await life.wait(() => C.expected({ library: 0 })), fields: { name: "TEST pot", description: "Native install witness", page: "shelf/0000000000000001.md", content: "TEST signed page text; screen agreement is not asserted." } };
      expect(await life.wait(() => C.act(sam, "donate", donation))).toMatchObject({ answer: "refused" });
      await life.wait(() => C.did(rita, "donate", donation));
      await dispatchFixture([C, G], life.wait);
      expect((await life.wait(() => G.summary())).value.items.find(item => item.type === "file-publication")).toMatchObject({ values: { path: donation.fields.page } });
    }
    expect((await life.wait(() => M.item(0))).values["memberActions"]).toContain(specimen.roles.member[0]);
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    await life.wait(() => D.restart());
    expect(await declared(D, f.packet.package.semantic.entry)).toBe(declarations[0]!.bytes);
    const history = await life.wait(() => A.entries());
    const original = history.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application");
    expect(original).toHaveLength(1);
    expect(original[0]!.input).toMatchObject({ type: "act", signed });
    expect(history.filter(entry => entry.input.type === "outcome")).toHaveLength(1);
    const current = (await life.wait(() => C.summary())).at;
    const provenance = await life.wait(() => (C.object as unknown as { source(seq: number, origin: boolean): Promise<Sourced> }).source(current.seq, true));
    const facts: Fetched[] = provenance.origin!.map(copy => ({ fact: copy.fact, entry: parseStrict(copy.bytes) as Fetched["entry"], under: copy.under }));
    const from = { at: await life.wait(() => C.at()), seq: current.seq, hash: current.hash };
    const directory = await life.wait(() => D.at()), destination = await life.wait(() => G.at());
    expect(installedApplicationPublicationOrigin(from, directory, destination, facts)).toBe(true);
    expect(applicationPublicationOrigin(from, directory, destination, facts)).toBe(false);
    expect(installedApplicationPublicationOrigin(from, directory, destination, facts.slice(0, 2))).toBeNull();
    expect(installedApplicationPublicationOrigin(from, { ...directory, inc: destination.inc }, destination, facts)).toBe(false);
    expect(installedApplicationPublicationOrigin(from, directory, { ...destination, scope: directory.scope }, facts)).toBe(false);
    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [A, D, C, G]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], node.name).toEqual(["consistent", null]);
    }
  } finally { await env.APPLICATION_CONTENT.delete(f.key); life.release(); }
}, 30_000);
