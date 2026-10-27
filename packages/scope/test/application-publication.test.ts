import { scopePublisher as publisher, publisherContainerData } from "./definition-corpus-data.ts";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { DeclaredDefinition, FactRef, Intent, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, factRefOf, intentDigest, isSeed, scopeIdOf, signIntent, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { applicationPublicationOrigin, archiveDevicePublicationOrigin, ARCHIVE_DEVICE_PUBLICATION_COHORT, FILE_PUBLICATION_COHORT, fileReceiptRef, platform } from "@generalbusiness/dap-platform";
import { Reader } from "@generalbusiness/dap-git";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { SqliteStore } from "../src/index.ts";
import type { EffectAnswer, EffectRequest, LateAnswers } from "../src/operations.ts";
import { namespace } from "../src/namespace.ts";
import { site } from "../src/site/route.ts";
import { ownHost } from "./hosts.ts";
import { soon } from "./net.ts";
import { Platform, rita, routed, sam } from "./repository.ts";
import { reader, dispatchFixture, driveFixture, effectFixture, nativeFixtureLifetime, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings } from "./fixtures-native.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { SCOPE_INDEX_NAME } from "../src/scope-index.ts";
import { siteTokenTestSettings } from "./worker.ts";

import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { packApplication2, readApplicationProjection } from "@generalbusiness/dap-platform/application-v2";
import { secretSigner, signedDeviceApplicationInstall } from "@generalbusiness/dap-client";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { fixedSigner } from "./fixtures-core.ts";
import { devicePackageFixture } from "../../derive/test/fixtures-device-command.ts";

// A made-up declared publisher deliberately uses the reserved word change.
// Its acts and native factory are real; no change-lane role is granted.

const bytes = canonicalize(publisher), digest = definitionDigest(publisher);
const SERVICE = "https://scopes.test";

// Actual native R9/D8/M4/Q3/G4, application authority, factory, delivery,
// SQLite, restart, Git object building and Site selection. OwnGit is a
// LABELLED host stand-in using maps and decoded wire packs. The clock,
// inspector readers and finite driver are fixture controls, not a provider.
test("a native application publishes once after missing proof, keeps later source order across restart, and cannot publish into another room", async () => {
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false });
  const cohort = FILE_PUBLICATION_COHORT;
  const rooms: Platform[] = [];
  const pause = async (nodes: readonly Platform[]) => {
    const callbacks = async () => {
      let joined = 0;
      for (const node of nodes) {
        const read = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
        if (!Number.isSafeInteger(read.callbacks) || read.callbacks < 0) throw new Error("The fixture callback count is invalid");
        joined += read.callbacks;
      }
      return joined;
    };
    for (let pass = 0; pass < 64; pass++) {
      await callbacks();
      await driveFixture(nodes, life.wait);
      if (await callbacks() === 0) return;
    }
    throw new Error("The fixture exceeded 64 callback and driver rounds");
  };
  const setup = async () => {
    const host = ownHost();
    const control: { allowPush: boolean; allowRead: boolean; losePushReply: boolean; pushes: string[];
      original: { request: EffectRequest; answer: EffectAnswer } | null; late: LateAnswers | null } = {
      allowPush: true, allowRead: true, losePushReply: false, pushes: [], original: null, late: null,
    };
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: { host: host.host, namespace: host.namespace, policy: "keys", "founders": [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: cohort.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
    const bindings = host.bindings(R.name);
    const wire = (node: Platform) => life.outside(node.name, (given, sql) => {
      const actual = host.outside(given, sql, bindings);
      return { ...actual,
        accepts: (owner, kind) => !(kind === "push" && !control.allowPush || kind === "read" && !control.allowRead) && actual.accepts(owner, kind),
        send: async request => {
          const answer = await actual.send(request);
          if (request.kind === "push") {
            control.pushes.push(request.operation);
            if (control.losePushReply && control.original === null && answer) { control.original = { request, answer }; return null; }
          }
          return answer;
        },
        late: deliver => { control.late = deliver; },
      };
    });
    wire(R);
    expect(await R.stub.create(signIntent(install, rita.secret), cohort.register)).toMatchObject({ answer: "accepted" });
    const matched = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", "founderHandle": "@rita", recoveryKey: sam.key } });
    const seed: Seed = { v: 1, kind: "directory", definition: cohort.directory, creator: await R.at(), cause: intentDigest(matched.intent), ordinal: 0 };
    const D = life.platform(scopeIdOf(seed));
    expect(await R.stub.submit(matched, [])).toMatchObject({ answer: "accepted" });
    await pause([R, D]);
    const initial = (await D.entries())[0]!;
    const sibling = (kind: ScopeRef["kind"]) => {
      const send = initial.sends.find(row => "definition" in row.to && row.to.kind === kind);
      if (!send || !("definition" in send.to)) throw new Error("the actual Directory creates each sibling");
      return life.platform(scopeIdOf(send.to));
    };
    const M = sibling("membership"), Q = sibling("rules"), G = sibling("destination");
    wire(G);
    await pause([R, D, M, Q, G]);
    const seat = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    expect(await Q.stub.submit(await Q.intent(rita, "activate", { fields: { digest, name: publisher.name } }), [], { values: [bytes] })).toMatchObject({ answer: "accepted" });
    const signed = await D.intent(rita, "establish-application", { expected: await D.expected({ repository: 0 }), fields: { definition: digest, values: "{}", execution: "recorded-do" } });
    const child = await D.stub.submit(signed, [], { values: [bytes] });
    expect(child.answer).toBe("accepted");
    if (child.answer !== "accepted") throw new Error("the native application creation is accepted");
    const C = await D.created(child.receipt.fact.seq);
    await pause([R, D, M, Q, G, C]);
    // The test's per-name outside factory is selected at object start. The
    // Directory delivered G's genesis before this fixture installed its host
    // factory. Restart with that factory and finish the native creation first.
    await G.restart();
    await pause([R, D, M, Q, G, C]);
    expect((await G.item(0)).state).toBe("ready");
    expect((await C.item(0)).refs["destination"]).toEqual(await G.at());
    const genesis = factRefOf((await C.entries())[0]!);
    const peer = await life.wait(() => namespace(env.PLATFORM).resolver.read(genesis, 30, true));
    expect(peer && "entry" in peer ? peer.origin?.length : null).toBe(3);
    expect(peer && "entry" in peer ? peer.under : null).toBe("declared:change");
    rooms.push(R, D, M, Q, G, C);
    return { host, bindings, control, R, D, M, Q, G, C };
  };
  const state = (G: Platform) => life.wait(() => runInDurableObject(G.object, (_object, storage) => {
    const store = new SqliteStore({ exec: (sql, ...args) => storage.storage.sql.exec(sql, ...args), transaction: run => storage.storage.transactionSync(run) });
    return store.all();
  }));
  const envelope = async (C: Platform, seq: number) => {
    const entry = (await C.entries())[seq]!, send = entry.sends[0]!;
    return { from: factRefOf(entry), n: send.n, to: send.to, message: send.message };
  };
  const readReceipt = async (host: ReturnType<typeof ownHost>, from: FactRef, n: number) => {
    const ref = fileReceiptRef({ from, n });
    // Read actual public objects decoded from the production port's push.
    // Reader checks their hashes, types, sizes and commit/tree linkage.
    const reader = new Reader({
      object: async id => { const object = host.stand.objects.get(id); return object ? { type: object.type, size: object.data.length, data: object.data } : null; },
      ref: async name => host.stand.refs.get(name) ?? null,
      refs: async (prefix, limit) => [...host.stand.refs].filter(([name]) => name.startsWith(prefix)).slice(0, limit + 1).map(([ref, target]) => ({ ref, target })),
    });
    const target = await reader.ref(ref);
    expect(target).not.toBeNull();
    if (!target) throw new Error("the exact send has a public receipt ref");
    const commit = await reader.linked(target), tree = await reader.tree(commit.tree);
    const file = tree.find(entry => new TextDecoder().decode(entry.name) === "receipt.json");
    if (!file) throw new Error("the receipt commit has its JSON file");
    return { ref, target, file: JSON.parse(new TextDecoder().decode(await reader.object(file.id, "blob"))) as Record<string, unknown> };
  };
  try {
    const a = await setup();
    let proofAvailable = false;
    const actual = namespace(env.PLATFORM).resolver;
    life.wire(a.G.name, () => ({ resolver: { read: async (fact, seconds, origin) => {
      const matched = await life.wait(() => actual.read(fact, seconds, origin));
      return matched && "entry" in matched && origin && !proofAvailable ? { ...matched, origin: matched.origin?.slice(0, 2) ?? [] } : matched;
    } } }));
    await a.G.restart();
    const beforeRead = await a.G.summary();
    const before = beforeRead.at;
    expect(beforeRead.value.reservationExpiry).toEqual({ clock: "available", time: timeOf(life.now()), expired: [] });
    const first = await a.C.did(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/native.md", content: "# First shelf\n" } });
    await dispatchFixture([a.C, a.G], life.wait);
    expect((await a.G.summary()).at).toEqual(before);
    expect((await state(a.G)).items.filter(item => item.type === "file-publication")).toHaveLength(0);
    proofAvailable = true;
    const firstCause = factRefOf((await a.C.entries())[first]!);
    const proof = await life.wait(() => actual.read(firstCause, 30, true));
    expect(proof && "entry" in proof ? applicationPublicationOrigin(firstCause, (await a.D.at()), (await a.G.at()), proof.origin ?? []) : null).toBe(true);
    life.advance(2000);
    await pause(rooms);
    let written = (await state(a.G)).items.filter(item => item.type === "file-publication");
    expect(written).toHaveLength(1);
    const inspection = await state(a.G);
    const sending = await life.wait(() => runInDurableObject(a.G.object, (_object, storage) => {
      const store = new SqliteStore({ exec: (sql, ...args) => storage.storage.sql.exec(sql, ...args), transaction: run => storage.storage.transactionSync(run) });
      return inspection.operations.filter(operation => operation.for === written[0]!.id).map(operation => ({ id: operation.id, sending: store.sending(operation.id, 1) }));
    }));
    expect(written[0], canonicalize({ items: inspection.items.map(item => ({ id: item.id, type: item.type, state: item.state,
      ...(item.type === "branch" ? { slot: item.values["slot"], judging: item.values["judging"] } : {}) })),
      sending, operations: inspection.operations.map(operation => ({ id: operation.id, kind: operation.kind, for: operation.for,
        outcomes: operation.attempts.map(attempt => attempt.outcomes.map(outcome => outcome.result)) })) })).toMatchObject({ state: "published", values: { sourceSeq: first, sourceOrdinal: 0, path: "shelf/native.md" } });
    const once = a.host.stand.pushes.filter(push => push.ref === "refs/heads/main").length;
    const finalHead = (await a.G.summary()).at;
    proofAvailable = false;
    expect(await a.G.stub.deliver(await envelope(a.C, first))).toMatchObject({ answer: "recorded" });
    expect((await a.G.summary()).at).toEqual(finalHead);
    expect(a.host.stand.pushes.filter(push => push.ref === "refs/heads/main")).toHaveLength(once);
    proofAvailable = true;
    // Already admitted and reserved work can become stale while its original
    // push remains unsent. The new native outcome records no sent mark.
    a.control.allowPush = false;
    await a.G.restart();
    const stale = await a.C.did(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/queued.md", content: "# Queued older page\n" } });
    await pause(rooms);
    const staleItem = (await state(a.G)).items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === stale)!;
    const stalePush = (await state(a.G)).operations.find(operation => operation.kind === "push" && operation.for === staleItem.id)!;
    expect(stalePush.attempts[0]!.outcomes).toEqual([]);
    const queuedNewer = await a.C.did(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/queued.md", content: "# Queued newer page\n" } });
    await pause(rooms);
    const pushCount = a.control.pushes.length;
    a.control.allowPush = true;
    await a.G.restart();
    await pause(rooms);
    const staleAfter = await state(a.G);
    expect(staleAfter.items.find(item => item.id === staleItem.id)?.state).toBe("superseded");
    expect(staleAfter.items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === queuedNewer)?.state).toBe("published");
    expect(a.control.pushes).not.toContain(stalePush.id);
    expect(a.control.pushes).toHaveLength(pushCount + 1);
    const notSent = await life.wait(() => runInDurableObject(a.G.object, (_object, storage) => {
      const store = new SqliteStore({ exec: (sql, ...args) => storage.storage.sql.exec(sql, ...args), transaction: run => storage.storage.transactionSync(run) });
      return store.sending(stalePush.id, 1)?.sent;
    }));
    expect(notSent).toBeNull();
    // The host applies the original push, but its reply is withheld. Its
    // deciding reads are held, so an actual unknown survives a restart.
    a.control.losePushReply = true; a.control.allowRead = false;
    const unknown = await a.C.did(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/unknown.md", content: "# Original unknown page\n" } });
    await pause(rooms);
    const unknownItem = (await state(a.G)).items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === unknown)!;
    expect(unknownItem.state).toBe("unresolved");
    const original = a.control.original;
    if (!original) throw new Error("the real original host answer is held");
    expect(a.control.pushes.filter(id => id === original.request.operation)).toHaveLength(1);
    await a.G.restart();
    await pause(rooms);
    expect((await state(a.G)).items.find(item => item.id === unknownItem.id)?.state).toBe("unresolved");
    expect((await a.G.item(0)).values["slot"]).toBe(unknownItem.id);
    expect(a.control.pushes.filter(id => id === original.request.operation)).toHaveLength(1);
    proofAvailable = false;
    if (!a.control.late) throw new Error("the restarted driver has its late-answer channel");
    const late = a.control.late;
    expect(await life.wait(() => runInDurableObject(a.G.object, () => late(original.request.operation, 1, original.answer)))).toEqual({ recorded: "unavailable" });
    proofAvailable = true;
    await pause(rooms);
    expect((await state(a.G)).items.find(item => item.id === unknownItem.id)?.state).toBe("published");
    const unknownPush = (await state(a.G)).operations.find(operation => operation.id === original.request.operation)!;
    expect(unknownPush.attempts[0]!.outcomes.map(outcome => outcome.result)).toEqual(["unknown", "confirmed"]);
    expect(a.control.pushes.filter(id => id === original.request.operation)).toHaveLength(1);
    a.control.losePushReply = false; a.control.allowRead = true;
    // Hold the earlier actual tell while admitting and publishing the later
    // actual entry. No source fact is scripted or re-signed at release.
    let held: FactRef | null = null;
    life.setHold(delivery => !!held && canonicalize(delivery.from) === canonicalize(held));
    const oldIntent = await a.C.intent(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/native.md", content: "# Older delayed shelf\n" } });
    // Hold every send from this scope until its accepted immutable cause is
    // known. Then keep only that original send behind the transport gate.
    life.setHold(delivery => delivery.from.at.scope === a.C.name);
    const old = await a.C.stub.submit(oldIntent, []);
    if (old.answer !== "accepted") throw new Error("the older actual entry is accepted");
    held = old.receipt.fact;
    life.setHold(delivery => canonicalize(delivery.from) === canonicalize(held));
    const later = await a.C.did(rita, "write", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { path: "shelf/native.md", content: "# Later shelf wins\n" } });
    await pause(rooms);
    await a.G.restart();
    const newerMain = a.host.stand.refs.get("refs/heads/main");
    const beforeRelease = a.host.stand.pushes.filter(push => push.ref === "refs/heads/main").length;
    life.setHold(() => false);
    life.advance(2000);
    await pause(rooms);
    written = (await state(a.G)).items.filter(item => item.type === "file-publication");
    expect(written.find(item => item.values["sourceSeq"] === old.receipt.fact.seq)?.state).toBe("superseded");
    expect(written.find(item => item.values["sourceSeq"] === later)?.state).toBe("published");
    expect(a.host.stand.refs.get("refs/heads/main")).toBe(newerMain);
    expect(a.host.stand.pushes.filter(push => push.ref === "refs/heads/main")).toHaveLength(beforeRelease);
    const oldReceipt = await readReceipt(a.host, old.receipt.fact, 0);
    const laterCause = factRefOf((await a.C.entries())[later]!);
    expect(oldReceipt.file).toMatchObject({ cause: { from: old.receipt.fact, n: 0 }, supersededBy: { from: laterCause, n: 0 },
      path: "shelf/native.md", contentDigest: textDigest("# Older delayed shelf\n"), commit: newerMain });
    const pair = await a.C.did(rita, "pair", { on: 0, expected: await a.C.expected({ on: 0 }), fields: { first: "shelf/ordinal-0.md", second: "shelf/ordinal-1.md", content: "# Both actual sends\n" } });
    await pause(rooms);
    const pairCause = factRefOf((await a.C.entries())[pair]!);
    const receipts = await Promise.all([0, 1].map(n => readReceipt(a.host, pairCause, n)));
    expect(receipts[0]!.ref).not.toBe(receipts[1]!.ref);
    expect(receipts[0]!.target).not.toBe(receipts[1]!.target);
    for (const [n, receipt] of receipts.entries()) expect(receipt.file).toMatchObject({ cause: { from: pairCause, n }, path: `shelf/ordinal-${n}.md`, contentDigest: textDigest("# Both actual sends\n") });
    // An actual nested child has room membership and a usable destination,
    // but its creator is an application, not the native Directory factory.
    const container = publisherContainerData(digest);
    const containerDigest = definitionDigest(container), containerBytes = canonicalize(container);
    expect(await a.Q.stub.submit(await a.Q.intent(rita, "activate", { fields: { digest: containerDigest, name: container.name, dependency1: digest } }), [], { values: [containerBytes, bytes] })).toMatchObject({ answer: "accepted" });
    life.advance(301000); // End the factory's documented 300-second definition observation reuse window.
    const parentIntent = await a.D.intent(rita, "establish-application", { expected: await a.D.expected({ repository: 0 }), fields: { definition: containerDigest, dependency1: digest, values: "{}", execution: "recorded-do" } });
    const made = await a.D.stub.submit(parentIntent, [], { values: [containerBytes, bytes] });
    expect(made.answer, canonicalize(made)).toBe("accepted");
    if (made.answer !== "accepted") throw new Error("the native container is created with its real named dependency");
    const parent = await a.D.created(made.receipt.fact.seq);
    await pause([a.D, parent]);
    const nested = await parent.created(0, 1);
    await pause([a.D, parent, nested]);
    const nestedWrite = await nested.did(rita, "write", { on: 0, expected: await nested.expected({ on: 0 }), fields: { path: "README.md", content: "# Not a native Directory application\n" } });
    const noAppHead = (await a.G.summary()).at;
    expect(await a.G.stub.deliver(await envelope(nested, nestedWrite))).toEqual({ answer: "source-unverified" });
    expect((await a.G.summary()).at).toEqual(noAppHead);
    // The provider is scripted; fixed-owner RPC, SQL and alarms remain actual.
    life.active();
    const siteTokenSettings = a.bindings;
    siteTokenTestSettings.set(SCOPE_INDEX_NAME, siteTokenSettings);
    life.cleanup(() => {
      if (siteTokenTestSettings.get(SCOPE_INDEX_NAME) === siteTokenSettings) siteTokenTestSettings.delete(SCOPE_INDEX_NAME);
    });
    const response = await life.wait(() => site(new Request(`${SERVICE}/site/${a.D.name}/${newerMain}/shelf/native.md`), { SCOPE_INDEX: env.SCOPE_INDEX, SCOPES: env.PLATFORM, ...siteTokenSettings }, a.host.stand.fetch, `fixture:${a.D.name}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Later shelf wins");
    const checkedHead = (await a.G.summary()).at;
    const replay = await life.wait(() => verify(httpSource(SERVICE, { fetch: routed, reader }), { mode: "replay", platform, grants: "proven", scope: a.G.name, head: checkedHead }));
    expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    const b = await setup();
    const signed = await a.D.intent(rita, "establish-application", { expected: await a.D.expected({ repository: 0 }), fields: { definition: digest, values: canonicalize({ other: await b.G.at() }), execution: "recorded-do" } });
    const creation = await a.D.stub.submit(signed, [], { values: [bytes] });
    if (creation.answer !== "accepted") throw new Error("a real own-room app can declare an arbitrary outside destination");
    const crossApp = await a.D.created(creation.receipt.fact.seq);
    await pause([a.D, crossApp]);
    const cross = await crossApp.did(rita, "elsewhere", { on: 0, expected: await crossApp.expected({ on: 0 }), fields: { path: "README.md", content: "# Foreign room\n" } });
    const foreignHead = (await b.G.summary()).at;
    expect(await b.G.stub.deliver(await envelope(crossApp, cross))).toEqual({ answer: "source-unverified" });
    expect((await b.G.summary()).at).toEqual(foreignHead);
  } finally { life.release(); }
});

// Native R18/D17/M8/Q10/G13 creation, signed v2 install and device owner
// grant. This TEST declaration reports a real device-command fixture's
// readings as files. Package HTTP, signing key, Git host and clock are
// labelled stand-ins; neither a deployed provider nor physical device runs.
test("an archive-device-publication application automatically publishes device reports and supersedes an unsent older report", async () => {
  const cohort = ARCHIVE_DEVICE_PUBLICATION_COHORT;
  const declared: DeclaredDefinition = {
    ...devicePackageFixture,
    items: { ...devicePackageFixture.items, root: { ...devicePackageFixture.items["root"]!, refs: {
      destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } },
    } } },
    acts: { ...devicePackageFixture.acts,
      start: { ...devicePackageFixture.acts["start"]!, fields: { destination: { type: "scope", kind: "destination", required: true } },
        effects: [{ ref: { slot: "destination", from: { field: "destination" } } }] },
      report: { ...devicePackageFixture.acts["report"]!, also: { root: { item: "root", one: true } },
        fields: { ...devicePackageFixture.acts["report"]!.fields, path: { type: "text", max: 256, required: true }, content: { type: "text", max: 1024, required: true } },
        sends: [{ tell: { to: { slot: "destination", of: "also.root" }, message: "publish-file",
          fields: { path: { field: "path" }, content: { field: "content" } }, result: { refused: [], undelivered: [] } } }],
      },
    },
  };
  const id = definitionDigest(declared);
  const packet = await packApplication2({ name: "test.device-file-publication", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: id, definitions: [{ id, bytes: canonicalize(declared) }],
    connections: [{ from: id, item: "root", slot: "destination", to: "outside" }],
    host: { execution: "recorded-do", profiles: ["restricted@1"] },
    capabilities: [{ name: DEVICE_COMMAND, bounds: { kinds: ["heater"], owners: 1 } }],
    roles: { admin: ["command", "start"] }, projections: { root: readApplicationProjection({ v: 1, definition: id, revision: "revision",
      sources: { root: { item: "root", read: "one", states: ["ready"], limit: 1, fields: {} } } }) }, predecessor: null,
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }],
    descriptions: {}, views: {}, resources: {} } }, fixedSigner(81));
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false });
  const host = ownHost();
  let allowPush = true;
  const pushedOperations: string[] = [];
  const pause = async (nodes: readonly Platform[]) => {
    const callbacks = async () => {
      let joined = 0;
      for (const node of nodes) {
        const read = await life.wait(() => (node.stub as unknown as { awaitScheduledCallbacks(): Promise<{ callbacks: number }> }).awaitScheduledCallbacks());
        if (!Number.isSafeInteger(read.callbacks) || read.callbacks < 0) throw Error("The fixture callback count is invalid");
        joined += read.callbacks;
      }
      return joined;
    };
    for (let pass = 0; pass < 64; pass++) {
      await callbacks(); await driveFixture(nodes, life.wait);
      if (await callbacks() === 0) return;
    }
    throw Error("The fixture exceeded 64 callback and driver rounds");
  };
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
      fields: { host: host.host, namespace: host.namespace, policy: "keys", founders: [rita.key] }, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: cohort.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
    const bindings = host.bindings(R.name);
    life.outside(R.name, (given, sql) => host.outside(given, sql, bindings));
    expect(await R.stub.create(signIntent(install, rita.secret), cohort.register)).toMatchObject({ answer: "accepted" });
    const found = await R.intent(rita, "found", { expected: await R.expected({ register: 0 }), fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } });
    const D = life.platform(scopeIdOf({ v: 1, kind: "directory", definition: cohort.directory, creator: await R.at(), cause: intentDigest(found.intent), ordinal: 0 }));
    expect(await R.stub.submit(found, [])).toMatchObject({ answer: "accepted" });
    await pause([R, D]);
    const initial = (await D.entries())[0]!;
    const sibling = (kind: ScopeRef["kind"]) => {
      const send = initial.sends.find(row => "definition" in row.to && row.to.kind === kind);
      if (!send || !("definition" in send.to)) throw Error("The real Directory creates each sibling");
      return life.platform(scopeIdOf(send.to));
    };
    const M = sibling("membership"), Q = sibling("rules"), G = sibling("destination");
    life.outside(G.name, (given, sql) => {
      const actual = host.outside(given, sql, bindings);
      return { ...actual,
        accepts: (capability, kind) => (kind !== "push" || allowPush) && actual.accepts(capability, kind),
        send: async request => {
          if (request.kind === "push") pushedOperations.push(request.operation);
          return actual.send(request);
        },
      };
    });
    await G.restart();
    const nodes = [R, D, M, Q, G];
    await pause(nodes);
    const seat = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) });
    const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
    const applicationBindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fixture.trust), env.SCOPE_INDEX);
    life.applicationTrust(() => applicationBindings.APPLICATION_TRUST);
    for (const node of [D, Q]) {
      life.outside(node.name, (given, sql) => hostOutside(given, sql, applicationBindings, peer.fetch));
      await node.restart();
    }
    const membership = await M.at(), directory = await D.at();
    const prepared = await signedDeviceApplicationInstall(secretSigner(rita.secret), packet.bytes,
      { rules: await Q.at(), uri: fixture.uri, release: packet.ids.release, roles: ["admin"], values: {}, owner: { membership, member: "@rita" } },
      { now: life.now(), idempotencyKey: "TEST-versioned-device-file-publication" });
    const installed = await Q.stub.submit(prepared.signed, [], prepared.beside);
    expect(installed).toMatchObject({ answer: "accepted" });
    if (installed.answer !== "accepted") return expect.fail("The signed device package must be installed");
    await effectFixture([Q], life.wait); await dispatchFixture(nodes, life.wait);
    const creation = (await D.entries()).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === id);
    if (!creation || !isSeed(creation.to)) return expect.fail("The native install must create this exact device publisher");
    expect(creation.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true,
      deviceCommand: { capability: DEVICE_COMMAND, owner: { membership, member: "@rita" }, root: id, definitions: [id] } } } });
    const C = life.platform(scopeIdOf(creation.to)); nodes.push(C);
    await pause(nodes);
    for (const [node, pin] of [[R, cohort.register], [D, cohort.directory], [M, cohort.membership], [Q, cohort.rules], [G, cohort.destination]] as const)
      expect((await node.summary()).value.definition).toBe(pin);
    expect(await Q.item(installed.receipt.fact.seq)).toMatchObject({ state: "active", refs: { scope: await C.at() } });
    expect((await C.item(0)).refs["destination"]).toEqual(await G.at());
    expect((await G.item(0)).state).toBe("ready");
    const device = await C.did(rita, "commission", { fields: { kind: "heater" } });
    const command = await C.did(rita, "command", { on: device, expected: await C.expected({ on: device }), fields: { target: "on", level: 80 } });
    expect((await C.entries())[command]!.input).toMatchObject({ type: "act", signed: { intent: { kind: "command" } } });
    expect(await C.item(device)).toMatchObject({ values: { kind: "heater", target: "on", level: 80 }, refs: { targetAt: command } });
    const state = () => life.wait(() => runInDurableObject(G.object, (_object, storage) => {
      const store = new SqliteStore({ exec: (sql, ...args) => storage.storage.sql.exec(sql, ...args), transaction: run => storage.storage.transactionSync(run) });
      return { ...store.all(), sending: store.all().operations.filter(row => row.kind === "push").map(row => ({ id: row.id, mark: store.sending(row.id, 1)?.sent })) };
    }));
    const report = async (content: string) => C.did(rita, "report", { on: device,
      expected: await C.expected({ on: device, root: 0 }), fields: { reported: 80, path: "device/reading.md", content } });
    const first = await report("# First device reading\n");
    await pause(nodes);
    const firstCause = factRefOf((await C.entries())[first]!);
    const proof = await life.wait(() => namespace(env.PLATFORM).resolver.read(firstCause, 30, true));
    expect(proof && "entry" in proof ? archiveDevicePublicationOrigin(firstCause, directory, await G.at(), proof.origin ?? []) : null).toBe(true);
    expect((await state()).items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === first)).toMatchObject({ state: "published" });
    const receiptReader = new Reader({
      object: async objectId => { const object = host.stand.objects.get(objectId); return object ? { type: object.type, size: object.data.length, data: object.data } : null; },
      ref: async name => host.stand.refs.get(name) ?? null,
      refs: async (prefix, limit) => [...host.stand.refs].filter(([name]) => name.startsWith(prefix)).slice(0, limit + 1).map(([ref, target]) => ({ ref, target })),
    });
    const receipt = async (from: FactRef) => {
      const target = await receiptReader.ref(fileReceiptRef({ from, n: 0 }));
      expect(target).not.toBeNull(); if (!target) throw Error("The real publication has an exact public receipt");
      const commit = await receiptReader.linked(target), tree = await receiptReader.tree(commit.tree);
      const file = tree.find(row => new TextDecoder().decode(row.name) === "receipt.json");
      if (!file) throw Error("The receipt commit contains receipt.json");
      return JSON.parse(new TextDecoder().decode(await receiptReader.object(file.id, "blob"))) as Record<string, unknown>;
    };
    expect(await receipt(firstCause)).toMatchObject({ cause: { from: firstCause, n: 0 }, path: "device/reading.md", contentDigest: textDigest("# First device reading\n") });
    allowPush = false; await G.restart();
    const old = await report("# Older queued device reading\n"); await pause(nodes);
    const queued = await state(), oldItem = queued.items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === old)!;
    expect(oldItem).toBeDefined();
    const oldPush = queued.operations.find(row => row.kind === "push" && row.for === oldItem.id)!;
    expect(oldPush.attempts[0]!.outcomes).toEqual([]);
    expect(queued.sending.find(row => row.id === oldPush.id)?.mark).toBeNull();
    expect(pushedOperations).not.toContain(oldPush.id);
    const latest = await report("# Latest device reading\n"); await pause(nodes);
    const pushCount = pushedOperations.length;
    const queuedHead = host.stand.refs.get("refs/heads/main");
    expect(queuedHead).not.toBeNull();
    expect(queuedHead).toBeDefined();
    allowPush = true; await G.restart(); await pause(nodes);
    const after = await state();
    expect(after.items.find(item => item.id === oldItem.id)?.state).toBe("superseded");
    expect(after.items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === latest)?.state).toBe("published");
    expect(after.sending.find(row => row.id === oldPush.id)?.mark).toBeNull();
    expect(pushedOperations).not.toContain(oldPush.id);
    expect(pushedOperations).toHaveLength(pushCount + 1);
    const oldCause = factRefOf((await C.entries())[old]!), latestCause = factRefOf((await C.entries())[latest]!);
    const head = host.stand.refs.get("refs/heads/main");
    expect(await receipt(oldCause)).toMatchObject({ cause: { from: oldCause, n: 0 }, supersededBy: { from: latestCause, n: 0 },
      path: "device/reading.md", contentDigest: textDigest("# Older queued device reading\n"), commit: queuedHead });
    expect(await receipt(latestCause)).toMatchObject({ cause: { from: latestCause, n: 0 }, path: "device/reading.md", contentDigest: textDigest("# Latest device reading\n") });
    // The provider is scripted; fixed-owner RPC, SQL and alarms remain actual.
    life.active();
    const siteTokenSettings = bindings;
    siteTokenTestSettings.set(SCOPE_INDEX_NAME, siteTokenSettings);
    life.cleanup(() => {
      if (siteTokenTestSettings.get(SCOPE_INDEX_NAME) === siteTokenSettings) siteTokenTestSettings.delete(SCOPE_INDEX_NAME);
    });
    const response = await life.wait(() => site(new Request(`${SERVICE}/site/${D.name}/${head}/device/reading.md`),
      { SCOPE_INDEX: env.SCOPE_INDEX, SCOPES: env.PLATFORM, ...siteTokenSettings }, host.stand.fetch, `fixture:${D.name}`));
    expect(response.status).toBe(200); expect(await response.text()).toContain("Latest device reading");
    expect(pushedOperations).not.toContain(oldPush.id);
  } finally { life.release(); }
});
